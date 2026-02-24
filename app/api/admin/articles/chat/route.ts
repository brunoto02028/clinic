import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { callAIChat } from '@/lib/ai-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, action } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  const systemInstruction = `You are an expert health content writer for "Bruno Physical Rehabilitation", a physiotherapy clinic in London and Ipswich, UK.

Your role is to help the admin create professional blog articles through conversation.

RULES:
- Be conversational and helpful
- When the admin gives you a topic or instructions, discuss it and ask clarifying questions if needed
- When the admin says to generate/write/create the article, or approves your suggestion, produce the full article
- When producing article content, ALWAYS respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing: { "title": "...", "excerpt": "...", "content": "<p>HTML content here</p>" }
- The content field MUST be valid HTML — NOT markdown
- Write 600-1200 words, professional and educational tone
- Evidence-based information where applicable
- Include practical tips patients can use
- If the admin asks for corrections or changes, apply them and return the updated JSON block
- If the admin is just chatting/discussing, respond conversationally WITHOUT JSON
- Language: match the admin's language (English or Portuguese)

CRITICAL HTML FORMATTING RULES for the "content" field:
- Structure the article with clear sections using <h2> for main headings and <h3> for sub-headings
- ALWAYS wrap headings in <strong> or make them bold: e.g. <h2><strong>Section Title</strong></h2>
- Each paragraph must be wrapped in <p> tags
- Leave VISUAL SEPARATION between sections: after each heading, start a new <p> block
- When the topic changes, ALWAYS add a new <h2> or <h3> heading to clearly mark the transition
- Use <strong> (bold) liberally for key terms, important concepts, and emphasis within paragraphs
- Use bullet lists (<ul><li>) for tips, symptoms, benefits — makes content scannable
- Use numbered lists (<ol><li>) for step-by-step instructions
- Use <em> (italic) for medical terms or references
- Add a brief introductory paragraph before the first heading
- End with a concluding paragraph or call-to-action
- The result should look professional and well-organised when rendered — easy to scan and read`;

  try {
    const reply = await callAIChat(messages, {
      systemPrompt: systemInstruction,
      temperature: 0.7,
      maxTokens: 8192,
    });

    // Try to extract JSON article from the response
    let article = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        article = JSON.parse(jsonMatch[1].trim());
      } catch { /* not valid JSON, that's fine */ }
    }

    return NextResponse.json({ reply, article });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
