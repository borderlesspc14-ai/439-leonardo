# Template de E-mail para EmailJS

## Subject (Assunto):
```
Atualização do seu pedido – Status: {{status_label}}
```

## Content (Conteúdo HTML) - Cole no campo "Content" do EmailJS:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Olá,</p>
  
  <p>O status do seu pedido foi atualizado para: <strong>{{status_label}}</strong> ({{status}}).</p>
  
  {{#if order_id}}
  <p>Referência do pedido: <strong>{{order_id}}</strong></p>
  {{/if}}
  
  <p>Qualquer dúvida, responda este e-mail ou entre em contato com o suporte.</p>
  
  <p>Obrigado!</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda diretamente se o seu provedor não suportar respostas.</p>
</body>
</html>
```

## Campos do Template (lado direito do EmailJS):

- **To Email**: `{{to_email}}`
- **From Name**: `Hublog WMS+` (ou deixe o padrão)
- **From Email**: Use o padrão (checkbox marcado)
- **Reply To**: Deixe vazio ou use `{{email}}` se quiser

---

**IMPORTANTE:** 
- Cole o HTML acima no campo **"Content"** do template no EmailJS
- O EmailJS vai renderizar o HTML corretamente, então as tags `<p>`, `<strong>`, etc. não vão aparecer como texto, mas sim como formatação visual
