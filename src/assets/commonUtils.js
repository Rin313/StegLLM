document.querySelectorAll('button').forEach(button => {//模块被import时自动执行//单工具类，方便导入
    if(!button.closest('form'))
        button.setAttribute('type','button');//button的tupe包括submit、reset和button
});
document.querySelectorAll('textarea').forEach(textarea => textarea.classList.add('resize-none'));
export const $ = id => document.getElementById(id);
export function setLang(textMap) {//{"zh-CN":[],"en":[]}这种紧凑的格式维护起来不太灵活，但有利于指示AI翻译//参考RFC 5646
    const supported=Object.keys(textMap);
    let lang = supported[0];
    for (const nL of navigator.languages) {
        const found = supported.find(x => x.toLowerCase() === nL.toLowerCase());
        if (found){
            lang=found;
            break;
        }
    }
    document.documentElement.lang=lang;//缺少的话不会弹出翻译提示
    return textMap[lang];
}
export function listenToggle(obj,key,defaultValue=true){
    obj.checked = getLocal(key,defaultValue);
    obj.addEventListener("change", () => setLocal(key, obj.checked));
}
async function _jsonFetch(url,{ headers = {}, body, ...rest } = {}) {
    if (body && body.constructor === Object) {
        headers['Content-Type'] ??= 'application/json';
        body = JSON.stringify(body);
    }
    const response = await fetch(url, { ...rest, headers, body });
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, data: await response.json().catch(() => undefined)});
    return response.json();//不支持纯文本、blob、204空响应
}
export const get = (url, params, options = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;
    return _jsonFetch(finalUrl, options);
};
export const post = (url, body, options = {}) => _jsonFetch(url, { ...options, method: 'POST', body });
export function getLocal(key, defaultValue) {
    const obj=localStorage.getItem(key);
    return obj?JSON.parse(obj):defaultValue;
}
export function setLocal(key,obj) {//不要添加其他操作函数，在外部处理后用set覆盖最为灵活。不应该忽略null或空序列，在特殊情况下是必要的
    localStorage.setItem(key, JSON.stringify(obj));
}
export function moveStrToEnd(list,str,max) {
    const index = list.indexOf(str);
    if (index !== -1) list.splice(index, 1);
    if(max&&list.length>=max)list.splice(0,list.length-max+1);
    list.push(str);
}
function exportFile(content,filename){
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');//File System Access API目前是实验性API
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
export async function generateKeyPair() {// 生成 ECC 密钥对
    const keyPair=await window.crypto.subtle.generateKey(
        {
            name: "ECDH",//ECDH输出一个共享密钥，ECDSA输出一个数字签名
            namedCurve: 'P-256'//P-256/P-384/P-521，P256的共享密钥最短，即密文最短。secp256k1针对签名和验签性能优化，但似乎不在规范中
        },
        true,// 密钥是否可导出
        ["deriveKey"]
    );
    const publickey=await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);// 导出为 JWK 格式。RAW，适用对称密钥和椭圆曲线公钥；PKCS8.适用RSA和椭圆曲线私钥；SPKI，适用于RSA和椭圆曲线公钥；JWK，适用任何类型密钥
    const privateKey=await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const kid=crypto.randomUUID();//标记密钥对便于区分
    exportFile(JSON.stringify(publickey),"public_"+kid)//导出为文件而不是字符串，避免剪切板风险//公钥可以从私钥计算得到，但没有必要额外开发找回公钥的功能
    exportFile(JSON.stringify(privateKey),"private_"+kid)
}
export function readTextFile(fileInput) {
    return new Promise((resolve) => {
        const files = fileInput.files;
        if (files&&files.length>0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.readAsText(file);
        }
        else resolve(null);
    });
}
export function shuffle(array, start = 0, end = array.length) {
    for (let i = end - 1; i > start; i--) {
        const j = Math.floor(Math.random() * (i - start + 1)) + start;
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
async function compress(uint8Array, format = 'deflate-raw') {//format:`gzip`,`deflate`,`deflate-raw`
    const compressedStream = new Response(uint8Array).body.pipeThrough(
        new CompressionStream(format)
    );
    return new Uint8Array(await new Response(compressedStream).arrayBuffer());
}
async function decompress(uint8Array, format = 'deflate-raw') {
    const decompressedStream = new Response(uint8Array).body.pipeThrough(
        new DecompressionStream(format)
    );
    return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}
import {unishox2_compress,unishox2_decompress,magic,USX_TEMPLATES} from 'unishox2.siara.cc';
magic.bits=0;
const utf8Encoder= new TextEncoder();
const utf8Decoder=new TextDecoder();
const USX_HCODES_NO_DICT = new Uint8Array([0x00,0x40,0x80,0x00,0xC0]);//偏爱无重复内容
const USX_HCODE_LENS_NO_DICT = new Uint8Array([2,2,2,0,2]);
const USX_FREQ_SEQ_TXT= ["https://"," the "," and ","tion"," with","ing","ment","github.com"];//待定:"我们","一个"
export async function unishoxCompress(str){
    let t = new Uint8Array(str.length*4);
    const len =unishox2_compress(str,str.length,t,USX_HCODES_NO_DICT,USX_HCODE_LENS_NO_DICT,USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    const result1=t.subarray(0,len);
    const result2=await compress(utf8Encoder.encode(str));
    return result1.length<result2.length?[result1,1]:[result2,0];//unishox2末尾补齐1，deflate按规范则应该是补齐0，但做截断处理平均减少3.5bit，但长度单位由字节变为bit，可表示量变为8192字节。而且这种方式也不适用加密。
}
export async function unishoxDecompress(base){//return useUnishox?unishox2_decompress(uint8Array,uint8Array.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES):utf8Decoder.decode(await decompress(uint8Array));
    let secret;
    try{
        secret=utf8Decoder.decode(await decompress(Array.isArray(base)?toBytes([...base, ...Array((8 - base.length % 8) % 8).fill(0)]):base));
    }
    catch{
        if(Array.isArray(base)){
            base=toBytes([...base, ...Array((8 - base.length % 8) % 8).fill(1)]);
        }
        secret=unishox2_decompress(base,base.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    }
    return secret;
}
import { p256 } from '@noble/curves/nist.js';
function compressPublicKey(uncompressedKey) {
    return p256.Point.fromBytes(uncompressedKey).toBytes(true);// 33 字节
}
function decompressPublicKey(compressedKey) {
    return p256.Point.fromBytes(compressedKey).toBytes(false); // 65 字节
}
export async function eccEncryptToUint8Array(messageUint8Array, recipientPublicJwk) {
    const recipientPublicKey = await crypto.subtle.importKey(//导入接收方公钥
        "jwk",
        recipientPublicJwk,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        false,
        []
    );
    const ephemeralKeyPair = await crypto.subtle.generateKey(//生成发送方临时密钥对
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        ["deriveKey"]
    );
    const sharedSecretKey = await crypto.subtle.deriveKey(//派生共享密钥
        {
            name: "ECDH",
            public: recipientPublicKey,
        },
        ephemeralKeyPair.privateKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));//生成随机 IV
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        sharedSecretKey,
        messageUint8Array
    ));
    const ephemeralPublicKey = compressPublicKey(new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)));//导出临时公钥
    return new Uint8Array([...ephemeralPublicKey,...iv,...ciphertext]);
}
export async function eccDecryptToUint8Array(encryptedData, recipientPrivateJwk) {
        const recipientPrivateKey = await crypto.subtle.importKey(//导入接收方私钥
            "jwk",
            recipientPrivateJwk,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            ["deriveKey"]
        );
        const ephemeralPublicKey = await crypto.subtle.importKey(//提取临时公钥
            "raw",
            decompressPublicKey(encryptedData.slice(0, 33)),
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            []
        );
        const sharedSecretKey = await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: ephemeralPublicKey,
            },
            recipientPrivateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            false,
            ["decrypt"]
        );
        return new Uint8Array(await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: encryptedData.slice(33, 33 + 12),
            },
            sharedSecretKey,
            encryptedData.slice(33 + 12)
        ));
}
export const toBinary = (bytes) => 
    Array.from(bytes).flatMap(byte => 
        Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
    );
export function toBytes(base){
    let bytes = new Uint8Array(Math.floor(base.length/8));let k=0;
    for(let i=0;i<base.length;i+=8){
        bytes[k++]=base[i]*128+base[i+1]*64+base[i+2]*32+base[i+3]*16+base[i+4]*8+base[i+5]*4+base[i+6]*2+base[i+7];
    }
    return bytes;
}
export function findSublist(mainList, subList) {
    const subListLength = subList.length;
    for (let i = 0; i <= mainList.length - subListLength; i++) {
        const slice = mainList.slice(i, i + subListLength);
        if (slice.every((item, index) => item === subList[index])) {
            return i;
        }
    }
    return -1;
}