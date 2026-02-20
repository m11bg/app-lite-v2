import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { z } from 'zod';
import logger from '../utils/logger';

/**
 * Esquema de validação para as variáveis de ambiente relacionadas ao serviço de e-mail.
 * Utiliza a biblioteca Zod para garantir que as configurações necessárias (SMTP, Host, etc.)
 * estejam presentes e no formato correto antes da aplicação iniciar.
 */
const emailEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('noreply@applite.com'),
    APP_URL: z.string().optional(),
});

/** Instância validada das variáveis de ambiente */
const env = emailEnvSchema.parse(process.env);

/**
 * @class EmailService
 * @description Serviço responsável pelo gerenciamento, configuração e disparo de e-mails da aplicação.
 * Implementa um padrão Singleton para garantir que o transportador de e-mail seja reutilizado.
 */
class EmailService {
    /** Instância do transportador do nodemailer (SMTP) */
    private transporter: Transporter | null = null;

    /**
     * @constructor
     * Inicializa a classe e dispara a configuração assíncrona do transportador.
     */
    constructor() {
        // Dispara a inicialização sem bloquear o thread principal
        void this.initializeTransporter();
    }

    /**
     * @private
     * @async
     * @method initializeTransporter
     * @description Configura o transportador de e-mail. 
     * RESOLUÇÃO DO PROBLEMA: Esta função foi ajustada para priorizar credenciais SMTP reais 
     * definidas no .env, mesmo que o ambiente seja 'development', evitando que e-mails fiquem 
     * presos apenas no Ethereal (modo de teste).
     * @returns {Promise<void>}
     */
    private async initializeTransporter(): Promise<void> {
        try {
            // REGRA DE NEGÓCIO: Se houver HOST e PASS configurados no .env, usamos o SMTP Real.
            // Isso resolve o problema de não receber e-mails reais durante o desenvolvimento.
            if (env.SMTP_HOST && env.SMTP_PASS) {
                this.transporter = nodemailer.createTransport({
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT || 465,
                    // Se a porta for 465, secure deve ser true. Para 587 (TLS), false.
                    secure: (env.SMTP_PORT || 465) === 465,
                    auth: { 
                        user: env.SMTP_USER, 
                        pass: env.SMTP_PASS 
                    },
                });
                logger.info(`📧 Email Service: SMTP Real (${env.SMTP_HOST}) iniciado.`);
            } 
            // FALLBACK: Se não houver SMTP configurado, usa o Ethereal apenas em ambiente de teste/dev
            else if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: { user: testAccount.user, pass: testAccount.pass },
                });
                logger.info('📧 Email Service: Modo Dev/Test (Ethereal) iniciado. Verifique os logs para a URL de preview.');
            } 
            // ERRO: Em produção, o serviço não inicia sem as credenciais corretas
            else {
                logger.warn('⚠️ Email Service: Credenciais de Produção ausentes no .env.');
                this.transporter = null;
            }
        } catch (error) {
            logger.error('❌ Falha ao iniciar serviço de email:', error);
            this.transporter = null;
        }
    }

    /**
     * @private
     * @async
     * @method sendInternal
     * @description Método interno que executa o envio do e-mail via nodemailer.
     * @param {SendMailOptions} options - Objeto contendo remetente, destinatário, assunto e conteúdo.
     * @throws {Error} Lança erro caso o envio falhe para tratamento no nível superior.
     * @returns {Promise<void>}
     */
    private async sendInternal(options: SendMailOptions): Promise<void> {
        // Tenta inicializar caso o transportador ainda não exista
        if (!this.transporter) await this.initializeTransporter();
        if (!this.transporter) {
            throw new Error('Serviço de e-mail não disponível (transportador não configurado).');
        }

        try {
            const info = await this.transporter.sendMail(options);
            
            // Log especial para debug em ambiente de desenvolvimento (URL do Ethereal)
            if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
                const preview = nodemailer.getTestMessageUrl(info);
                if (preview) logger.info(`📨 Preview do Email: ${preview}`);
            } else {
                logger.info(`📨 Email enviado: ${info.messageId}`);
            }
        } catch (error) {
            logger.error(`❌ Erro no envio para ${String(options.to)}:`, error);
            throw error; // Propaga o erro para ser capturado no Controller
        }
    }

    /**
     * @public
     * @async
     * @method sendWelcomeEmail
     * @description Formata e envia o e-mail de boas-vindas para novos usuários cadastrados.
     * @param {string} to - E-mail de destino do usuário.
     * @param {string} userName - Nome do usuário para saudação personalizada.
     * @returns {Promise<void>}
     */
    public async sendWelcomeEmail(to: string, userName: string): Promise<void> {
        // Template HTML básico do e-mail
        const htmlContent = `
      <div style="font-family: sans-serif; color: #333; padding: 20px;">
        <h2>Bem-vindo ao App Lite, ${userName}! 🚀</h2>
        <p>Sua conta foi criada com sucesso em nossa plataforma.</p>
        <p>Estamos muito felizes em ter você conosco!</p>
        <br />
        <small>Este é um e-mail automático, por favor não responda.</small>
      </div>
    `;

        // Executa o envio
        await this.send({
            to,
            subject: 'Bem-vindo ao App Lite!',
            html: htmlContent,
        });
    }

    /**
     * @public
     * @async
     * @method sendResetPasswordEmail
     * @description Envia um e-mail de redefinição de senha com um token único.
     * @param {string} to - E-mail de destino do usuário.
     * @param {string} token - Token de redefinição de senha.
     * @param {string} [resetCode] - Código de 6 dígitos opcional.
     * @returns {Promise<void>}
     */
    public async sendResetPasswordEmail(to: string, token: string, resetCode?: string): Promise<void> {
        const primary = '#007AFF';
        const codeBlock = resetCode
            ? `<div style="margin-top:16px;text-align:center">
                 <div style="font-size:28px;letter-spacing:6px;font-weight:700;color:#111">${resetCode}</div>
               </div>`
            : '';
        const baseUrl = (env.APP_URL && env.APP_URL.trim()) ? env.APP_URL.replace(/\/+$/, '') : 'https://app-super.digital';
        const webLink = `${baseUrl}/api/auth/reset-password/${token}`;

        const htmlContent = `
  <div style="margin:0;padding:0;background:#f5f7fb">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f7fb;padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.06)">
            <tr>
              <td style="padding:24px 24px 8px 24px;background:${primary};color:#fff;font-family:Inter,Segoe UI,Arial,sans-serif">
                <h1 style="margin:0;font-size:22px;font-weight:700">App Lite</h1>
                <p style="margin:6px 0 0 0;font-size:13px;opacity:.9">Redefinição de senha</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111">
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;color:#222">Recebemos uma solicitação para redefinir sua senha.</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#444">Você pode redefinir agora clicando no botão abaixo. Se preferir, use o código de validação no app.</p>
                <div style="text-align:center;margin:24px 0">
                  <a href="${webLink}"
                     style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px">
                    Redefinir Senha Agora
                  </a>
                </div>
                <p style="margin:0 0 8px 0;font-size:13px;color:#555;text-align:center">
                  Se o botão acima não funcionar, abra o aplicativo e insira o código de validação abaixo:
                </p>
                ${codeBlock}
                <div style="margin-top:24px;border-top:1px solid #eee;padding-top:12px">
                  <p style="margin:0;color:#666;font-size:12px;line-height:1.5">
                    Por segurança, este link expira em 1 hora. Se você não solicitou, ignore este e-mail.
                  </p>
                </div>
              </td>
            </tr>
          </table>
          <div style="color:#8898aa;font-size:12px;margin-top:12px;font-family:Inter,Segoe UI,Arial,sans-serif">© ${new Date().getFullYear()} App Lite</div>
        </td>
      </tr>
    </table>
  </div>`;

        await this.send({
            to,
            subject: 'Redefinição de senha - App Lite',
            html: htmlContent,
        });
    }

    /**
     * @public
     * @async
     * @method send
     * @description Método público que permite o envio de e-mails personalizados (ex: token de confirmação).
     * @param {SendMailOptions} options - Objeto contendo remetente, destinatário, assunto e conteúdo.
     * @returns {Promise<void>}
     */
    public async send(options: SendMailOptions): Promise<void> {
        return this.sendInternal({
            from: `"App Lite" <${env.EMAIL_FROM}>`,
            ...options,
        });
    }
}

/** Exportação da instância única do serviço (Singleton) */
export const emailService = new EmailService();
export default emailService;

