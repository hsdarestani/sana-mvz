function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"content-type":"application/json; charset=utf-8"}
  });
}

function escapeHtml(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function extensionOf(name=""){
  const parts=String(name).toLowerCase().split(".");
  return parts.length>1 ? parts.pop() : "";
}

async function toBase64(file){
  const buffer=await file.arrayBuffer();
  const bytes=new Uint8Array(buffer);
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}

export async function onRequestPost({request,env}){
  try{
    const form=await request.formData();

    const honeypot=String(form.get("website")||"").trim();
    if(honeypot) return json({ok:true});

    const name=String(form.get("name")||"").trim();
    const phone=String(form.get("phone")||"").trim();
    const email=String(form.get("email")||"").trim();
    const worktime=String(form.get("worktime")||"").trim();
    const start=String(form.get("start")||"").trim();
    const message=String(form.get("message")||"").trim();
    const consent=String(form.get("consent")||"").trim();

    if(!name || !phone || consent!=="yes"){
      return json({message:"Bitte fülle Name und Telefon aus und bestätige den Datenschutz."},400);
    }

    const cv=form.get("cv");
    const attachments=[];

    if(cv && typeof cv==="object" && "size" in cv && cv.size>0){
      if(cv.size>5*1024*1024){
        return json({message:"Der Lebenslauf darf maximal 5 MB groß sein."},413);
      }
      const ext=extensionOf(cv.name);
      if(!["pdf","doc","docx"].includes(ext)){
        return json({message:"Bitte lade den Lebenslauf als PDF, DOC oder DOCX hoch."},400);
      }
      attachments.push({
        filename:cv.name || ("Lebenslauf."+ext),
        content:await toBase64(cv)
      });
    }

    if(!env.RESEND_API_KEY || !env.APPLICATION_FROM_EMAIL){
      return json({message:"Das Bewerbungsformular ist noch nicht vollständig für den Versand eingerichtet."},503);
    }

    const to=env.APPLICATION_TO_EMAIL || "info@ortho-frankfurt.de";
    const replyTo=email || undefined;

    const safe={
      name:escapeHtml(name),
      phone:escapeHtml(phone),
      email:escapeHtml(email || "Nicht angegeben"),
      worktime:escapeHtml(worktime || "Nicht angegeben"),
      start:escapeHtml(start || "Nicht angegeben"),
      message:escapeHtml(message || "Keine Nachricht")
    };

    const payload={
      from:env.APPLICATION_FROM_EMAIL,
      to:[to],
      subject:"Neue MFA Bewerbung Sana MVZ Frankfurt",
      html:`
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#08243a">
          <h2>Neue MFA Bewerbung</h2>
          <p><strong>Name:</strong> ${safe.name}</p>
          <p><strong>Telefon:</strong> ${safe.phone}</p>
          <p><strong>E Mail:</strong> ${safe.email}</p>
          <p><strong>Arbeitszeit:</strong> ${safe.worktime}</p>
          <p><strong>Möglicher Start:</strong> ${safe.start}</p>
          <p><strong>Nachricht:</strong><br>${safe.message.replaceAll("\n","<br>")}</p>
        </div>
      `,
      text:[
        "Neue MFA Bewerbung",
        "",
        "Name: "+name,
        "Telefon: "+phone,
        "E Mail: "+(email||"Nicht angegeben"),
        "Arbeitszeit: "+(worktime||"Nicht angegeben"),
        "Möglicher Start: "+(start||"Nicht angegeben"),
        "",
        "Nachricht:",
        message||"Keine Nachricht"
      ].join("\n")
    };

    if(replyTo) payload.reply_to=replyTo;
    if(attachments.length) payload.attachments=attachments;

    const resend=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{
        authorization:"Bearer "+env.RESEND_API_KEY,
        "content-type":"application/json"
      },
      body:JSON.stringify(payload)
    });

    if(!resend.ok){
      const detail=await resend.text();
      console.error("Resend error",resend.status,detail.slice(0,500));
      return json({message:"Die Bewerbung konnte gerade nicht gesendet werden. Bitte versuche es später erneut."},502);
    }

    return json({ok:true});
  }catch(error){
    console.error("Application error",error);
    return json({message:"Die Bewerbung konnte gerade nicht gesendet werden. Bitte versuche es später erneut."},500);
  }
}

export function onRequestGet(){
  return json({message:"Diese Adresse akzeptiert nur Bewerbungen über das Formular."},405);
}
