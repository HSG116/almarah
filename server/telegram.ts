import TelegramBot from 'node-telegram-bot-api';

// Data structure: Token -> { phone, status, chatId, startTime }
export const verificationSession: Record<string, { phone: string; status: 'PENDING' | 'VERIFIED' | 'FAILED'; chatId?: number }> = {};

// Credentials
const token = '8595708777:AAHrPuB3cZaw2Eh5wkbV6CI4eRuA2YNyqi8';

let bot: TelegramBot | null = null;

export function setupTelegramBot() {
    if (bot) return; // Prevent double init

    try {
        bot = new TelegramBot(token, { polling: true });
        console.log('Telegram Bot Started (Deep Link Mode) 🚀');

        // Handle /start <TOKEN>
        bot.onText(/\/start (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const startToken = match?.[1];

            if (!startToken || !verificationSession[startToken]) {
                bot?.sendMessage(chatId, "⚠️ *عذراً، هذا الرابط غير صالح أو منتهي الصلاحية.*", { parse_mode: 'Markdown' });
                return;
            }

            const session = verificationSession[startToken];
            session.chatId = chatId; // Track user

            const welcomeMessage = `
👋 *مرحباً بك في نظام التحقق!*

لإتمام عملية التسجيل للرقم *${session.phone.slice(-4)}...*
يرجى الضغط على الزر أدناه للموافقة ⬇️
`;

            const opts = {
                parse_mode: 'Markdown' as const,
                reply_markup: {
                    keyboard: [
                        [{
                            text: "✅ تأكيد ومشاركة رقمي",
                            request_contact: true
                        }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            };

            bot?.sendMessage(chatId, welcomeMessage, opts);
        });

        // Handle Contact
        bot.on('contact', async (msg: any) => {
            const chatId = msg.chat.id;
            const contact = msg.contact;

            if (!contact || !contact.phone_number) return;

            if (contact.user_id !== msg.from?.id) {
                bot?.sendMessage(chatId, "❌ *لا يمكن التحقق من جهة اتصال لشخص آخر.*", { parse_mode: 'Markdown' });
                return;
            }

            // Normalize incoming phone (remove all non-digits)
            const incomingPhone = contact.phone_number.replace(/\D/g, '');
            console.log('📱 Incoming phone from Telegram:', incomingPhone);
            console.log('📋 Active sessions:', Object.entries(verificationSession).map(([token, data]) => ({
                token,
                phone: data.phone,
                status: data.status
            })));

            // Find matching session
            let foundToken: string | null = null;
            for (const [t, data] of Object.entries(verificationSession)) {
                if (data.status === 'PENDING') {
                    const expected = data.phone.replace(/\D/g, '');
                    console.log(`🔍 Comparing: incoming="${incomingPhone}" vs expected="${expected}"`);

                    // Try multiple matching strategies
                    // 1. Exact match
                    if (incomingPhone === expected) {
                        console.log('✅ Exact match found!');
                        foundToken = t;
                        break;
                    }

                    // 2. Incoming contains expected (user entered local number, telegram sends with country code)
                    if (incomingPhone.endsWith(expected)) {
                        console.log('✅ Suffix match found!');
                        foundToken = t;
                        break;
                    }

                    // 3. Expected contains incoming (unlikely but possible)
                    if (expected.endsWith(incomingPhone)) {
                        console.log('✅ Prefix match found!');
                        foundToken = t;
                        break;
                    }
                }
            }

            if (foundToken) {
                verificationSession[foundToken].status = 'VERIFIED';
                console.log('✅ Verification successful for token:', foundToken);
                bot?.sendMessage(chatId, `✅ *تم التحقق بنجاح!* \n\nيمكنك العودة للموقع الآن.`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
            } else {
                console.log('❌ No matching session found for phone:', incomingPhone);
                bot?.sendMessage(chatId, `❌ *عذراً، الرقم المرسل لا يطابق الرقم المسجل.*\n\nالرقم المستلم: ${incomingPhone}`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
            }
        });

    } catch (error) {
        console.error("Failed to start Telegram bot:", error);
    }
}
