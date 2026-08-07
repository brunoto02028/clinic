FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ARG STRIPE_SECRET_KEY
ARG NEXT_OUTPUT_MODE=standalone
ENV DATABASE_URL=${DATABASE_URL}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV NEXT_OUTPUT_MODE=${NEXT_OUTPUT_MODE}
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM base AS runner
RUN apk add --no-cache openssl su-exec python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages --no-cache-dir yt-dlp
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p ./public/uploads && chown nextjs:nodejs ./public/uploads && chmod 755 ./public/uploads
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img
# jsPDF + its runtime deps — needed by scripts/seed-lead-magnet-guides.js,
# which runs as a plain `node` script (outside the Next.js/webpack bundle),
# so it can't rely on Next's standalone output tracing to have included them.
COPY --from=builder /app/node_modules/jspdf ./node_modules/jspdf
COPY --from=builder /app/node_modules/fflate ./node_modules/fflate
COPY --from=builder /app/node_modules/fast-png ./node_modules/fast-png
COPY --from=builder /app/node_modules/@babel/runtime ./node_modules/@babel/runtime
COPY --from=builder /app/scripts/seed-lead-magnet-guides.js ./scripts/seed-lead-magnet-guides.js
COPY --from=builder /app/scripts/fix-shockwave-service-pages.js ./scripts/fix-shockwave-service-pages.js
COPY --from=builder /app/scripts/seed-book-content.js ./scripts/seed-book-content.js
COPY --from=builder /app/scripts/update-chapter-one-content.js ./scripts/update-chapter-one-content.js
COPY --from=builder /app/book ./book

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000

CMD ["/start.sh"]
