const dict = {
  "zh-CN": {
    "generateKey": "生成密钥",
    "publicKeyTitle": "输入接收方的公钥（可选）",
    "privateKeyTitle": "输入你的私钥（可选）",
    "secretPlaceholder": "输入需加密信息",
    "coverTextPlaceholder": "输入需解密掩饰文本",
    "promptPlaceholder": "输入任务提示，例如：\"保持不输出额外的说明，不间断地续写一段散文：\"",
    "hide": "隐写",
    "extract": "提取",
    "insertionText": "支持前后插入",
    "stopTip": "掩饰文本嵌入任意内容后仍可准确解密，略微增加暴露风险",
    "hideTip": "点击停止隐写",
    "generateKeyPairMsg": "请安全保存你的私钥，并与接收方提前交换公钥",
    "failMsg": "请尝试更发散的任务提示，或减少输入"
  },
  "en": {
    "generateKey": "Generate keys",
    "publicKeyTitle": "Enter the recipient's public key (optional)",
    "privateKeyTitle": "Enter your private key (optional)",
    "secretPlaceholder": "Enter the message to encrypt",
    "coverTextPlaceholder": "Enter the cover text to decrypt",
    "promptPlaceholder": "Enter a task prompt, e.g.: \"Do not output any additional explanations; continue a piece of prose without interruption:\"",
    "hide": "Embed",
    "extract": "Extract",
    "insertionText": "Supports prefix/suffix insertion",
    "stopTip": "The cover text can still be accurately decrypted after arbitrary content is embedded, with a slight increase in exposure risk",
    "hideTip": "Click to stop embedding",
    "generateKeyPairMsg": "Please keep your private key secure and exchange public keys with the recipient in advance",
    "failMsg": "Please try a more open-ended prompt, or reduce the input"
  }
};

const supported = Object.keys(dict);
const lang = navigator.languages
  .map(nL => supported.find(sL => sL.toLowerCase() === nL.toLowerCase()))
  .find(Boolean)
  || supported[0];
document.documentElement.lang = lang;
const locale = dict[lang];

export const t = (key, fallback) => key in locale ? locale[key] : (dict[supported[0]]?.[key] ?? fallback ?? key);
export default t;
