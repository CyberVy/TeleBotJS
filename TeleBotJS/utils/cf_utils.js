class Sender {

    constructor(TGTokens,ID,parse_mode="HTML") {
        this.token = TGTokens
        this.chat_id = ID
        this.parse_mode = parse_mode
    }

    async send(text) {
        let message = text
        console.log(message)
        try {
            let r = await fetch('https://api.telegram.org/bot' + this.token + '/' + "sendMessage",
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chat_id,
                        text: message,
                        parse_mode: this.parse_mode
                    })
                })
            return await r.json()
        }
        catch (error) {
            console.log(`send function error ${error}`)
        }
    }

    async sendBlobFile(blob,filename,caption){

        const formData = new FormData()
        formData.append('chat_id', this.chat_id)
        formData.append('document', blob,filename)
        formData.append('caption', caption)

        try {
            return  await fetch(`https://api.telegram.org/bot${this.token}/sendDocument`,
                {method: 'POST', body: formData,})
        } catch (error) {
            console.error(`sendBlobFile function error ${error}`);
        }
    }

    async edit(text,message_id){
        let message = text
        console.log(message)
        try {
            let r = await fetch('https://api.telegram.org/bot' + this.token + '/' + "editMessageText",
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chat_id,
                        message_id:message_id,
                        text: message,
                        parse_mode: this.parse_mode
                    })
                })
            return await r.json()
        }
        catch (error) {
            console.log(`Failed to edit: `, error)
        }
    }
}

// fn_dict: {function f(text: str,sender: Sender) -> str or blob,...}
async function cf_bot_template(fn_dict,tg_token,request,env,ctx){
    let url = new URL(request.url)
    if (url.pathname === "/" && request.method === 'GET'){
        let webhookURL = `https://api.telegram.org/bot${tg_token}/setWebhook?url=${request.url}`
        return await fetch(webhookURL)
    }
    if (request.method === "POST"){
        let incomingMessage = (await request.json()).message
        let chat_id = incomingMessage?.chat?.id
        let sender = new Sender(tg_token,chat_id,"HTML")
        if (incomingMessage?.text){
            for (let command in fn_dict){
                if (incomingMessage.text.startsWith(command)){
                    ctx.waitUntil(fn_dict[command](incomingMessage.text.slice(command.length),sender).then(outgoingMessage => {
                        if (outgoingMessage && outgoingMessage.constructor.name === "String"){
                            return sender.send(outgoingMessage)
                        }
                        else if (outgoingMessage.constructor.name === "Blob"){
                            return sender.sendBlobFile(outgoingMessage,outgoingMessage.filename,outgoingMessage.caption)
                        }
                    }))
                    break
                }
            }
        }
        return new Response("POST Received.")
    }
    return new Response("Invalid Request.",{status:400})
}

export {
    Sender,
    cf_bot_template
}
