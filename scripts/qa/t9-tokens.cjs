// TEMPORÁRIO — assina tokens para o cruzamento da T-9.
const fs=require('fs'),path=require('path'),{createHmac}=require('crypto');
for(const l of fs.readFileSync(path.join(__dirname,'..','..','.env'),'utf8').split(/\r?\n/)){
  const m=l.match(/^\s*NEXTAUTH_SECRET\s*=\s*"?([^"]+?)"?\s*$/); if(m&&!process.env.NEXTAUTH_SECRET)process.env.NEXTAUTH_SECRET=m[1];}
const TTL=5*60*1000;
const sign=p=>createHmac('sha256',process.env.NEXTAUTH_SECRET).update(p).digest('base64url');
const tok=(fileId,userId,ttl=TTL)=>{const p=`${fileId}.${userId}.${Date.now()+ttl}`;return `${Buffer.from(p).toString('base64url')}.${sign(p)}`;};
const [,,fileId,userId,ttl]=process.argv;
process.stdout.write(tok(fileId,userId,ttl?Number(ttl):TTL));
