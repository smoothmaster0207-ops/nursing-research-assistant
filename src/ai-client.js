/**
 * ai-client.js — OpenAI API wrapper with demo mode fallback
 */

import { state } from './state.js';
import { DEMO_RESPONSES } from './prompts/index.js';

export async function callAI(systemPrompt, userMessage, options = {}) {
    const isDemo = state.get('demoMode');
    const apiKey = state.get('apiKey');
    const apiProvider = state.get('apiProvider') || 'gemini';

    if (isDemo || !apiKey) {
        // Demo mode: return mock response
        return await getDemoResponse(options.module || 'default', userMessage);
    }

    // JSON出力を期待するモジュールのリスト
    const jsonModules = ['designSelection', 'rqOverview', 'literatureReview', 'statisticsProposal'];
    const expectJson = jsonModules.includes(options.module);

    try {
        if (apiProvider === 'gemini') {
            // Gemini API Call
            const model = options.model || 'gemini-2.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            // Convert OpenAI history format to Gemini format
            const contents = [];
            if (options.history) {
                options.history.forEach(msg => {
                    contents.push({
                        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                });
            }
            contents.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });

            const generationConfig = {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens || 4096,
            };
            // JSON出力が期待されるモジュールではresponseMimeTypeを設定
            if (expectJson) {
                generationConfig.responseMimeType = 'application/json';
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        role: 'system',
                        parts: [{ text: systemPrompt }]
                    },
                    contents: contents,
                    generationConfig: generationConfig,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `Gemini API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } else {
            // Default: OpenAI API Call
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: options.model || 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...(options.history || []),
                        { role: 'user', content: userMessage },
                    ],
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens || 4096,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `OpenAI API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

async function getDemoResponse(module, _userMessage) {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    // For rqAssistant, track conversation turns and return evolving responses
    if (module === 'rqAssistant') {
        const history = JSON.parse(localStorage.getItem('research-app-state') || '{}');
        const chatHistory = history?.seed?.chatHistory || [];
        const userMsgCount = chatHistory.filter(m => m.role === 'user').length;

        if (userMsgCount <= 1) {
            return `ありがとうございます！とても具体的なイメージが湧いてきました。\n\n65歳以上の急性期病棟の患者さんを対象に、多職種連携の退院支援の効果を検証するという方向ですね。\n\nもう少し教えてください：\n- **介入の具体的な内容**: 現在の退院支援と比べて、どんな「新しい取り組み」を導入したいですか？（例：退院支援カンファレンスの標準化、退院後フォローアップの仕組みなど）\n- **アウトカム指標**: 「再入院が減った」かどうかを、どんな指標で測りたいですか？（例：30日以内再入院率、患者満足度、在宅療養日数など）`;
        } else if (userMsgCount <= 2) {
            return `なるほど、かなり研究の輪郭が見えてきましたね！\n\n整理すると：\n- **P（対象）**: 65歳以上の急性期病棟入院患者\n- **I（介入）**: 標準化された多職種連携退院支援プログラム\n- **C（比較）**: 従来の退院支援\n- **O（結果）**: 30日以内再入院率の低下\n\nこれは非常に実現可能性が高く、臨床的意義も大きいテーマですね。もう1点だけ確認させてください：\n- **研究環境**: データ収集が可能な施設や協力体制はありますか？また、倫理審査の見通しはいかがでしょうか？`;
        } else {
            return `素晴らしい情報をありがとうございます。研究の骨子がまとまりました！\n\nこの内容で「整理された研究の骨子」をお出ししますので、次のステップで具体的な研究デザインを検討していきましょう。`;
        }
    }

    return DEMO_RESPONSES[module] || DEMO_RESPONSES.default;
}
