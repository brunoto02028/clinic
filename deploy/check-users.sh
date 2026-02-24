#!/bin/bash
cd /root/clinic
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, email: true, role: true } })
  .then(users => {
    users.forEach(u => console.log(u.id, u.email, u.role));
    return p.\$disconnect();
  })
  .catch(e => { console.error(e); process.exit(1); });
"
