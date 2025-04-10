//分出多个工具类，导入反而更麻烦
export default new Proxy({}, {//据说使用缓存会导致可能的奇怪问题
    get: (_, prop) => typeof prop === 'string' && /^[\w$]+$/.test(prop)
        ? document.getElementById(prop)
        : undefined
});
export function setAllButtonTypesToButton() {
    const buttons = document.querySelectorAll('button:not(form button)');
    buttons.forEach(button => {button.setAttribute('type', 'button');});//button的tupe包括submit、reset和button，显示指定以避免控制台提示。
}
export function get(key, defaultValue) {
    const obj=localStorage.getItem(key);
    return obj?JSON.parse(obj):defaultValue;
}
export function save(key,obj) {
    if (obj===''||Array.isArray(obj)&&obj.length===0)
        localStorage.removeItem(key);
    else
        localStorage.setItem(key, JSON.stringify(obj));
}
export function saveList(key, obj,index=-1){
    let list=get(key,[]);
    if(index===-1)
        list.push(obj);
    else {
        if(obj)
            list[index]=obj;
        else if(list.length>0){
            list.splice(index,1);
        }
    }
    save(key,list)
}
function clear(){
    localStorage.clear();
}
export function runIfMatch(key,defaultValue,opts,f=()=>{}){
    const obj=get(key,defaultValue);
    for (const [opt, value] of Object.entries(opts))
        if(obj===opt) return f(value);
    save(key,defaultValue);//如果存在新版本key弃用的值，就重新初始化
}
function createElement(tag,props={},styles={},parent=null){//
    const el = Object.assign(document.createElement(tag), props);
    Object.assign(el.style,styles);
    if(parent)parent.appendChild(el);
    return el;
}
export function exportFile(content,filename){
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    createElement('a',{
        href: url,
        download: filename
    }).click();
    URL.revokeObjectURL(url);
}
async function exportKeys(keyPair) {//导出为文件而不是字符串，避免剪切板风险//公钥可以从私钥计算得到，没有必要额外存储公钥
    const publickey=await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);// 导出为 JWK 格式。RAW，适用对称密钥和椭圆曲线公钥；PKCS8.适用RSA和椭圆曲线私钥；SPKI，适用于RSA和椭圆曲线公钥；JWK，适用任何类型密钥
    const privateKey=await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const kid=crypto.randomUUID();//标记密钥对便于区分
    exportFile(JSON.stringify(publickey),"public_"+kid)
    exportFile(JSON.stringify(privateKey),"private_"+kid)
}
export async function generateKeyPair() {// 生成 ECC 密钥对
    const keyPair=await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: 'P-256'//P-256/P-384/P-521，P256的共享密钥最短，即密文最短
        },
        true,// 密钥是否可导出
        ["deriveKey"]
    );
    await exportKeys(keyPair);
}
export function exportLocalStorage() {
    const obj = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        obj[key] = JSON.parse(value);
    }
    exportFile(JSON.stringify(obj),"config.json");
}
function importTextFile() {
    return new Promise((resolve) => {
        const input = createElement('input',{type:'file'});
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsText(file);
        };
        input.click();
    });
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
export async function importLocalStorage() {
    const obj=JSON.parse(await importTextFile());//如果未提交则后面不会执行
    clear();
    for (const [key, value] of Object.entries(obj))
        save(key,value);
}
export function initDaisyThemeController(){
    const themeButtons = document.querySelectorAll(`input[name="theme-dropdown"]`);
    themeButtons.forEach(button=>{
        button.addEventListener('change', function(event) {
            if (event.target.checked) {
                save('theme', event.target.value);
            }
        });
    })
}
export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function uint8ArrayToReadableStream(uint8Array) {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(uint8Array);
            controller.close();
        }
    });
}
async function readStream(stream) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const compressedData = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));//拼接chunk的低内存占用方式
    let offset = 0;
    for (const chunk of chunks) {
        compressedData.set(chunk, offset);
        offset += chunk.length;
    }
    return compressedData;
}
async function compress(uint8Array,format='deflate-raw') {//format:`gzip`,`deflate`,`deflate-raw`
    return await readStream(uint8ArrayToReadableStream(uint8Array).pipeThrough(new CompressionStream(format)));
}
async function decompress(uint8Array,format='deflate-raw') {
    return await readStream(uint8ArrayToReadableStream(uint8Array).pipeThrough(new DecompressionStream(format)));
}

import {unishox2_compress, unishox2_decompress} from './unishox2.js';
const utf8Encoder= new TextEncoder();
const utf8Decoder=new TextDecoder();
const USX_HCODES_NO_DICT = new Uint8Array([0x00,0x40,0x80,0x00,0xC0]);//偏爱无重复内容
const USX_HCODE_LENS_NO_DICT = new Uint8Array([2,2,2,0,2]);
const USX_FREQ_SEQ_TXT= [" the "," and ","tion"," with","ing","ment","https://"];//中文很难找规律，待定:"我们","一个"
const USX_TEMPLATES = ["tfff-of-tfTtf:rf:rf.fffZ", "tfff-of-tf", "(fff) fff-ffff", "tf:rf:rf", 0];
export async function unishoxCompress(str){//混合使用效果更差
    let t = new Uint8Array(str.length*4);
    const len =unishox2_compress(str,str.length, t,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    const result1=t.subarray(0,len);
    const result2=await compress(utf8Encoder.encode(str));
    return result1.length<result2.length?[result1,1]:[result2,0];//unishox2末尾补齐1，deflate按规范则应该是补齐0，但做截断处理平均减少3.5bit，但长度单位由字节变为bit，可表示量变为8192字节。而且这种方式也不适用加密。
}
export async function unishoxDecompress(uint8Array,useUnishox=1){
    //return useUnishox?unishox2_decompress(uint8Array,uint8Array.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES):utf8Decoder.decode(await decompress(uint8Array));
    let secret;
    try{
        secret=utf8Decoder.decode(await decompress(uint8Array));
    }
    catch{
        secret=unishox2_decompress(uint8Array,uint8Array.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    }
    return secret;
}
import {p256} from '@noble/curves/p256';
function compressPublicKey(uncompressedKey) {
    if (!(uncompressedKey instanceof Uint8Array) || uncompressedKey.length !== 65 || uncompressedKey[0] !== 0x04) {
        throw new Error("Invalid uncompressed public key format");
    }

    const pubPoint = p256.ProjectivePoint.fromHex(uncompressedKey);
    return pubPoint.toRawBytes(true); // 33 字节
}
function decompressPublicKey(compressedKey) {
    if (!(compressedKey instanceof Uint8Array) || compressedKey.length !== 33 || (compressedKey[0] !== 0x02 && compressedKey[0] !== 0x03)) {
        throw new Error("Invalid compressed public key format");
    }
    const pubPoint = p256.ProjectivePoint.fromHex(compressedKey);
    return pubPoint.toRawBytes(false); // 65 字节
}
export async function eccEncryptToUint8Array(messageUint8Array, recipientPublicJwk) {//ECC（如 ECDH）用来安全地派生一个共享对称密钥，AES-GCM 用这个密钥来高效、安全地加密数据。这是现代加密通信的标准做法，称为「混合加密（Hybrid Encryption）」。
    //导入接收方公钥
    const recipientPublicKey = await crypto.subtle.importKey(
        "jwk",
        recipientPublicJwk,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        false,
        []
    );
    //生成发送方临时密钥对
    const ephemeralKeyPair = await crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        ["deriveKey"]
    );
    //导出临时公钥
    let ephemeralPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)
    );
    //压缩临时公钥
    ephemeralPublicKeyRaw=compressPublicKey(ephemeralPublicKeyRaw);
    //派生共享密钥
    const sharedSecretKey = await crypto.subtle.deriveKey(
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

    //生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    //加密数据（使用 AES-GCM）
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        sharedSecretKey,
        messageUint8Array
    );
    const ciphertext = new Uint8Array(encryptedBuffer);
    // 格式: [ephemeralPublicKey| iv| ciphertext]
    const totalLength = ephemeralPublicKeyRaw.length + iv.length + ciphertext.length;
    const result = new Uint8Array(totalLength);
    result.set(ephemeralPublicKeyRaw, 0);
    result.set(iv, ephemeralPublicKeyRaw.length);
    result.set(ciphertext, ephemeralPublicKeyRaw.length + iv.length);
    return result;
}
export async function eccDecryptToUint8Array(encryptedData, recipientPrivateJwk) {
    try {
        // 1. 导入接收方私钥
        const recipientPrivateKey = await crypto.subtle.importKey(
            "jwk",
            recipientPrivateJwk,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            ["deriveKey"]
        );
        // 压缩的公钥长度为33字节（P-256压缩格式）
        const ephemeralPublicKeyLength = 33;
        // IV 长度为12字节（AES-GCM标准）
        const ivLength = 12;

        // 提取临时公钥（压缩格式）
        const ephemeralPublicKeyCompressed = encryptedData.slice(0, ephemeralPublicKeyLength);
        // 提取 IV
        const iv = encryptedData.slice(ephemeralPublicKeyLength, ephemeralPublicKeyLength + ivLength);
        // 提取密文
        const ciphertext = encryptedData.slice(ephemeralPublicKeyLength + ivLength);

        // 3. 解压临时公钥并导入
        const ephemeralPublicKeyRaw = decompressPublicKey(ephemeralPublicKeyCompressed);
        const ephemeralPublicKey = await crypto.subtle.importKey(
            "raw",
            ephemeralPublicKeyRaw,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            []
        );

        // 4. 派生共享密钥
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

        // 5. 解密数据
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedSecretKey,
            ciphertext
        );

        // 6. 返回解密后的明文
        return new Uint8Array(decryptedBuffer);
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}
export async function tokenize(str) {
    const response = await fetch('http://127.0.0.1:8090/tokenize', {
        method: 'POST',
        body: JSON.stringify({content: str}),
    });
    const json=(await response.json());
    return json.tokens;
}
export async function detokenize(tokens) {
    const response = await fetch('http://127.0.0.1:8090/detokenize', {
        method: 'POST',
        body: JSON.stringify({tokens: tokens}),
    });
    const json=(await response.json());
    return json.content;
}
export async function initLogitBias(orgin,port) {    //针对特定模型词汇表进行处理，效果还行
    try{
        const response = await fetch(`http://127.0.0.1:${port}/props`);
        const json=(await response.json());
        const model=json.default_generation_settings.model.toLowerCase();
        if(model.includes("qwen2.5")){
            orgin=[...orgin,...[[94,false],[95,false],[96,false],[97,false],[98,false],[99,false],[100,false],[101,false],[102,false],[103,false],[104,false],[105,false],[106,false],[107,false],[108,false],[109,false],[110,false],[111,false],[112,false],[113,false],[114,false],[115,false],[116,false],[117,false],[118,false],[119,false],[120,false],[121,false],[122,false],[123,false],[124,false],[125,false],[126,false],[127,false],[128,false],[129,false],[130,false],[131,false],[132,false],[133,false],[134,false],[135,false],[136,false],[137,false],[138,false],[139,false],[140,false],[141,false],[142,false],[143,false],[144,false],[145,false],[146,false],[147,false],[148,false],[149,false],[150,false],[151,false],[152,false],[153,false],[154,false],[155,false],[156,false],[157,false],[158,false],[159,false],[160,false],[161,false],[162,false],[163,false],[164,false],[165,false],[166,false],[167,false],[168,false],[169,false],[170,false],[171,false],[172,false],[173,false],[174,false],[175,false],[176,false],[177,false],[178,false],[179,false],[180,false],[181,false],[182,false],[183,false],[184,false],[185,false],[186,false],[187,false],[222,false],[223,false],[224,false],[225,false],[226,false],[227,false],[228,false],[229,false],[230,false],[231,false],[232,false],[233,false],[234,false],[235,false],[236,false],[237,false],[238,false],[239,false],[240,false],[241,false],[242,false],[243,false],[244,false],[245,false],[246,false],[247,false],[248,false],[249,false],[250,false],[251,false],[252,false],[253,false],[254,false],[255,false],[378,false],[636,false],[1277,false],[1278,false],[1540,false],[1683,false],[2139,false],[2194,false],[2226,false],[2775,false],[2858,false],[3023,false],[3219,false],[3315,false],[3402,false],[3490,false],[3648,false],[4175,false],[4811,false],[4891,false],[4973,false],[5140,false],[5502,false],[5564,false],[5758,false],[5902,false],[5953,false],[6142,false],[6518,false],[6564,false],[6567,false],[6571,false],[6606,false],[6684,false],[7045,false],[7158,false],[7311,false],[7367,false],[7492,false],[7536,false],[7588,false],[7851,false],[7908,false],[8032,false],[8079,false],[8158,false],[8508,false],[8519,false],[8620,false],[8803,false],[8839,false],[8843,false],[8908,false],[9035,false],[9260,false],[9284,false],[9722,false],[9843,false],[10081,false],[10203,false],[10236,false],[10417,false],[10663,false],[10764,false],[10768,false],[10996,false],[11125,false],[11162,false],[11336,false],[11484,false],[11534,false],[11620,false],[11621,false],[11995,false],[12274,false],[12491,false],[12585,false],[12619,false],[12787,false],[13058,false],[13092,false],[13165,false],[13344,false],[13465,false],[13512,false],[13519,false],[13531,false],[13558,false],[13567,false],[13846,false],[13869,false],[13949,false],[13982,false],[14273,false],[14368,false],[14467,false],[14520,false],[14546,false],[14559,false],[14675,false],[14922,false],[14925,false],[14936,false],[14942,false],[14959,false],[15005,false],[15127,false],[15213,false],[15224,false],[15362,false],[15393,false],[15600,false],[15675,false],[15798,false],[15827,false],[15896,false],[15902,false],[15927,false],[16160,false],[16235,false],[16499,false],[16633,false],[16747,false],[16751,false],[16778,false],[16825,false],[17049,false],[17156,false],[17158,false],[17284,false],[17383,false],[17401,false],[17429,false],[17462,false],[17467,false],[17587,false],[17641,false],[17730,false],[17783,false],[18059,false],[18137,false],[18505,false],[18535,false],[18585,false],[19088,false],[19113,false],[19261,false],[19457,false],[19468,false],[19549,false],[19564,false],[19741,false],[19946,false],[19956,false],[20026,false],[20047,false],[20098,false],[20136,false],[20382,false],[20472,false],[20711,false],[20741,false],[20778,false],[20879,false],[20885,false],[20919,false],[21012,false],[21103,false],[21135,false],[21280,false],[21530,false],[21562,false],[21704,false],[21849,false],[22009,false],[22042,false],[22129,false],[22247,false],[22597,false],[22612,false],[22762,false],[22859,false],[23093,false],[23272,false],[23433,false],[23444,false],[23687,false],[23781,false],[23872,false],[23894,false],[24041,false],[24045,false],[24071,false],[24159,false],[24212,false],[24345,false],[24447,false],[24485,false],[24735,false],[24749,false],[24831,false],[24864,false],[25011,false],[25125,false],[25145,false],[25209,false],[25452,false],[25521,false],[25703,false],[25772,false],[25870,false],[25917,false],[25928,false],[26188,false],[26254,false],[26336,false],[26454,false],[26525,false],[26601,false],[26771,false],[26853,false],[26927,false],[27095,false],[27209,false],[27214,false],[27260,false],[27325,false],[27398,false],[27487,false],[27517,false],[27538,false],[27640,false],[27757,false],[27767,false],[27982,false],[27999,false],[28107,false],[28145,false],[28653,false],[28757,false],[28927,false],[29150,false],[29220,false],[29237,false],[29389,false],[29675,false],[29768,false],[29941,false],[29955,false],[29975,false],[30006,false],[30274,false],[30395,false],[30484,false],[30520,false],[30828,false],[30838,false],[30916,false],[31286,false],[31305,false],[31338,false],[31411,false],[31482,false],[31501,false],[32181,false],[32208,false],[32254,false],[32343,false],[32465,false],[32495,false],[32843,false],[32926,false],[32985,false],[33173,false],[33352,false],[33424,false],[33543,false],[33556,false],[33593,false],[33739,false],[33986,false],[34143,false],[34369,false],[34410,false],[34429,false],[34577,false],[34622,false],[34629,false],[34759,false],[34811,false],[34992,false],[35017,false],[35049,false],[35055,false],[35125,false],[35146,false],[35178,false],[35293,false],[35358,false],[35496,false],[35635,false],[35720,false],[36097,false],[36109,false],[36330,false],[36548,false],[36669,false],[36677,false],[36695,false],[36978,false],[37064,false],[37148,false],[37195,false],[37289,false],[37440,false],[37472,false],[37509,false],[37698,false],[37913,false],[38177,false],[38419,false],[38433,false],[38522,false],[38523,false],[38903,false],[38911,false],[39098,false],[39175,false],[39317,false],[39366,false],[39834,false],[40419,false],[40666,false],[40714,false],[40732,false],[40747,false],[40771,false],[41479,false],[41902,false],[42144,false],[42236,false],[42311,false],[42476,false],[42849,false],[43410,false],[43459,false],[43547,false],[43559,false],[43614,false],[43716,false],[43720,false],[43752,false],[44014,false],[44044,false],[44054,false],[44104,false],[44258,false],[44401,false],[44680,false],[44706,false],[44726,false],[44818,false],[44832,false],[44834,false],[44851,false],[44965,false],[45104,false],[45130,false],[45313,false],[45881,false],[46018,false],[46218,false],[46282,false],[46353,false],[46500,false],[46602,false],[46750,false],[46800,false],[46832,false],[46871,false],[47378,false],[47379,false],[47455,false],[47665,false],[47911,false],[47972,false],[48108,false],[48312,false],[48364,false],[48458,false],[48533,false],[48591,false],[48749,false],[48754,false],[48800,false],[48840,false],[49128,false],[49166,false],[49173,false],[49420,false],[49434,false],[49602,false],[49943,false],[50102,false],[50111,false],[50362,false],[51088,false],[51275,false],[51414,false],[51461,false],[51497,false],[52133,false],[52408,false],[52506,false],[52798,false],[52806,false],[52887,false],[53025,false],[53496,false],[53497,false],[53556,false],[53599,false],[53989,false],[54128,false],[54470,false],[54492,false],[54599,false],[54642,false],[54699,false],[54784,false],[54955,false],[55059,false],[55729,false],[55838,false],[55890,false],[56252,false],[56823,false],[56842,false],[57133,false],[57154,false],[57160,false],[57599,false],[57743,false],[58098,false],[58169,false],[58208,false],[58230,false],[58299,false],[58464,false],[58522,false],[58557,false],[58715,false],[58899,false],[58994,false],[59053,false],[59139,false],[60596,false],[60627,false],[60757,false],[60864,false],[60985,false],[61617,false],[61804,false],[62005,false],[62099,false],[62416,false],[62544,false],[62618,false],[62740,false],[62823,false],[63039,false],[63046,false],[63219,false],[63400,false],[63761,false],[64388,false],[64520,false],[64805,false],[64893,false],[65185,false],[65197,false],[65291,false],[65456,false],[65519,false],[65553,false],[65699,false],[65722,false],[65727,false],[65850,false],[65877,false],[66118,false],[66261,false],[66498,false],[66521,false],[66635,false],[67895,false],[68172,false],[68250,false],[68294,false],[68298,false],[68405,false],[68433,false],[68597,false],[68739,false],[68941,false],[69033,false],[69192,false],[69382,false],[69383,false],[69441,false],[69687,false],[69792,false],[70179,false],[70297,false],[70467,false],[70585,false],[70597,false],[70731,false],[71306,false],[71443,false],[71481,false],[71928,false],[71933,false],[72036,false],[72219,false],[72344,false],[72496,false],[72497,false],[72509,false],[72573,false],[73147,false],[74165,false],[74209,false],[74361,false],[74577,false],[74866,false],[74884,false],[75107,false],[75132,false],[75142,false],[75360,false],[75375,false],[75598,false],[75671,false],[75962,false],[76080,false],[76497,false],[76952,false],[76986,false],[77047,false],[77137,false],[77156,false],[77407,false],[77596,false],[78910,false],[78971,false],[79142,false],[79207,false],[79302,false],[79326,false],[79427,false],[79531,false],[79590,false],[79621,false],[79879,false],[79888,false],[80080,false],[80090,false],[80178,false],[80702,false],[81250,false],[81942,false],[82501,false],[82706,false],[82712,false],[82798,false],[82912,false],[83002,false],[83050,false],[83164,false],[83191,false],[83226,false],[83643,false],[83849,false],[84141,false],[84200,false],[84215,false],[84238,false],[84563,false],[84567,false],[84705,false],[85413,false],[85794,false],[86089,false],[86643,false],[87299,false],[87959,false],[88541,false],[88940,false],[89061,false],[89083,false],[89095,false],[89179,false],[89297,false],[89363,false],[89434,false],[90476,false],[90557,false],[90639,false],[90679,false],[90711,false],[90734,false],[90839,false],[90894,false],[91048,false],[91050,false],[91771,false],[91888,false],[92120,false],[92173,false],[92187,false],[93178,false],[93255,false],[93437,false],[93920,false],[94305,false],[94491,false],[94825,false],[94964,false],[95069,false],[95211,false],[95522,false],[95741,false],[96155,false],[96808,false],[96938,false],[97015,false],[97172,false],[97259,false],[97529,false],[97946,false],[98313,false],[98642,false],[98734,false],[99012,false],[99156,false],[99157,false],[99158,false],[99159,false],[99160,false],[99161,false],[99162,false],[99163,false],[99166,false],[99167,false],[99168,false],[99169,false],[99170,false],[99171,false],[99173,false],[99174,false],[99175,false],[99176,false],[99177,false],[99179,false],[99181,false],[99183,false],[99184,false],[99187,false],[99188,false],[99189,false],[99192,false],[99196,false],[99197,false],[99198,false],[99201,false],[99202,false],[99203,false],[99206,false],[99207,false],[99211,false],[99214,false],[99215,false],[99220,false],[99221,false],[99224,false],[99228,false],[99229,false],[99230,false],[99231,false],[99238,false],[99239,false],[99240,false],[99247,false],[99248,false],[99249,false],[99254,false],[99255,false],[99256,false],[99264,false],[99265,false],[99266,false],[99267,false],[99268,false],[99269,false],[99274,false],[99275,false],[99276,false],[99281,false],[99282,false],[99289,false],[99290,false],[99291,false],[99300,false],[99301,false],[99302,false],[99303,false],[99311,false],[99323,false],[99324,false],[99325,false],[99341,false],[99342,false],[99343,false],[99344,false],[99359,false],[99374,false],[99380,false],[99381,false],[99382,false],[99401,false],[99402,false],[99423,false],[99439,false],[99442,false],[99443,false],[99444,false],[99456,false],[99484,false],[99485,false],[99516,false],[99551,false],[99552,false],[99597,false],[99598,false],[99643,false],[99648,false],[99649,false],[99714,false],[99715,false],[99777,false],[99785,false],[99874,false],[99875,false],[99977,false],[99997,false],[100024,false],[100120,false],[100121,false],[100127,false],[100128,false],[100129,false],[100130,false],[100337,false],[100459,false],[100563,false],[100620,false],[100621,false],[100988,false],[101018,false],[101022,false],[101024,false],[101025,false],[101026,false],[101027,false],[101028,false],[101029,false],[101030,false],[101031,false],[101032,false],[101033,false],[101759,false],[101838,false],[101851,false],[101860,false],[101861,false],[101862,false],[101863,false],[101864,false],[101865,false],[101866,false],[101867,false],[101868,false],[101869,false],[101870,false],[101871,false],[101872,false],[101873,false],[101874,false],[101875,false],[101876,false],[101877,false],[101878,false],[101879,false],[101880,false],[101881,false],[103893,false],[103894,false],[103895,false],[103896,false],[103897,false],[103898,false],[103899,false],[103900,false],[103901,false],[103902,false],[103903,false],[103904,false],[103905,false],[103906,false],[103907,false],[103908,false],[103909,false],[103910,false],[103911,false],[103912,false],[103913,false],[103914,false],[103915,false],[103916,false],[103917,false],[104905,false],[105619,false],[109241,false],[109992,false],[110713,false],[111747,false],[112951,false],[113943,false],[114235,false],[114397,false],[115646,false],[117035,false],[119158,false],[119346,false],[119347,false],[119348,false],[119941,false],[119964,false],[120100,false],[120409,false],[121404,false],[121667,false],[121773,false],[122154,false],[122174,false],[122202,false],[122219,false],[122222,false],[122259,false],[122267,false],[122289,false],[122317,false],[122375,false],[122382,false],[122427,false],[122448,false],[122455,false],[122514,false],[122568,false],[122596,false],[122614,false],[122618,false],[122634,false],[122659,false],[122725,false],[122740,false],[122757,false],[122802,false],[122843,false],[122855,false],[122866,false],[122890,false],[122948,false],[122950,false],[122976,false],[122985,false],[122999,false],[123007,false],[123008,false],[123016,false],[123057,false],[123064,false],[123067,false],[123072,false],[123084,false],[123091,false],[123131,false],[123164,false],[123178,false],[123182,false],[123204,false],[123206,false],[123287,false],[123301,false],[123305,false],[123318,false],[123332,false],[123378,false],[123400,false],[123408,false],[123420,false],[123489,false],[123516,false],[123527,false],[123547,false],[123614,false],[123658,false],[123676,false],[123701,false],[123714,false],[123740,false],[123747,false],[123760,false],[123806,false],[123807,false],[123808,false],[123810,false],[123811,false],[123812,false],[123813,false],[123814,false],[123815,false],[123816,false],[123817,false],[123819,false],[123821,false],[123825,false],[123827,false],[123830,false],[123836,false],[123837,false],[123839,false],[123840,false],[123841,false],[123842,false],[123844,false],[123846,false],[123847,false],[123848,false],[123851,false],[123853,false],[123854,false],[123859,false],[123867,false],[123870,false],[123871,false],[123875,false],[123876,false],[123882,false],[123889,false],[123892,false],[123893,false],[123907,false],[123908,false],[123911,false],[123912,false],[123916,false],[123917,false],[123918,false],[123927,false],[123928,false],[123929,false],[123930,false],[123931,false],[123932,false],[123933,false],[123934,false],[123946,false],[123947,false],[123950,false],[123951,false],[123953,false],[123954,false],[123955,false],[123956,false],[123957,false],[123965,false],[123967,false],[123968,false],[123969,false],[123970,false],[123986,false],[123989,false],[123996,false],[124000,false],[124001,false],[124002,false],[124003,false],[124004,false],[124005,false],[124018,false],[124019,false],[124020,false],[124021,false],[124022,false],[124023,false],[124024,false],[124025,false],[124026,false],[124049,false],[124050,false],[124051,false],[124052,false],[124053,false],[124054,false],[124063,false],[124064,false],[124066,false],[124067,false],[124068,false],[124069,false],[124070,false],[124071,false],[124092,false],[124096,false],[124098,false],[124099,false],[124100,false],[124101,false],[124102,false],[124118,false],[124134,false],[124135,false],[124136,false],[124137,false],[124149,false],[124154,false],[124159,false],[124160,false],[124161,false],[124162,false],[124163,false],[124164,false],[124165,false],[124166,false],[124167,false],[124168,false],[124193,false],[124194,false],[124195,false],[124196,false],[124197,false],[124198,false],[124199,false],[124200,false],[124201,false],[124222,false],[124235,false],[124236,false],[124240,false],[124241,false],[124243,false],[124244,false],[124245,false],[124246,false],[124247,false],[124248,false],[124249,false],[124250,false],[124251,false],[124252,false],[124287,false],[124296,false],[124297,false],[124298,false],[124299,false],[124300,false],[124301,false],[124302,false],[124303,false],[124304,false],[124305,false],[124306,false],[124307,false],[124308,false],[124309,false],[124334,false],[124349,false],[124364,false],[124365,false],[124366,false],[124367,false],[124368,false],[124369,false],[124370,false],[124371,false],[124372,false],[124373,false],[124374,false],[124433,false],[124459,false],[124470,false],[124471,false],[124472,false],[124473,false],[124474,false],[124475,false],[124570,false],[124577,false],[124578,false],[124579,false],[124580,false],[124581,false],[124582,false],[124583,false],[124584,false],[124585,false],[124586,false],[124587,false],[124588,false],[124589,false],[124590,false],[124591,false],[124592,false],[124593,false],[124594,false],[124595,false],[124596,false],[124693,false],[124727,false],[124744,false],[124745,false],[124746,false],[124747,false],[124748,false],[124749,false],[124750,false],[124751,false],[124752,false],[124753,false],[124754,false],[124755,false],[124995,false],[124996,false],[124997,false],[124998,false],[124999,false],[125000,false],[125001,false],[125002,false],[125003,false],[125004,false],[125388,false],[125413,false],[125414,false],[125415,false],[125416,false],[125417,false],[125418,false],[125419,false],[125420,false],[125421,false],[125422,false],[125423,false],[125424,false],[125425,false],[125426,false],[125427,false],[125428,false],[125429,false],[125430,false],[125639,false],[125713,false],[126159,false],[126177,false],[126178,false],[126179,false],[126180,false],[126181,false],[126182,false],[126183,false],[126184,false],[126185,false],[126186,false],[126187,false],[126188,false],[126189,false],[126190,false],[126191,false],[126192,false],[126193,false],[126365,false],[126537,false],[127041,false],[127124,false],[127165,false],[127369,false],[127572,false],[127708,false],[127819,false],[127964,false],[128222,false],[128223,false],[128224,false],[128225,false],[128226,false],[128227,false],[128228,false],[128229,false],[128230,false],[128231,false],[128232,false],[128233,false],[128234,false],[128235,false],[128236,false],[128237,false],[128238,false],[128239,false],[128240,false],[128241,false],[128242,false],[129176,false],[130507,false],[132202,false],[132376,false],[133552,false],[134312,false],[134380,false],[134582,false],[135078,false],[136279,false],[136516,false],[136661,false],[136940,false],[136946,false],[137345,false],[137661,false],[137767,false],[137973,false],[138658,false],[138673,false],[139793,false],[139816,false],[140356,false],[141539,false],[142067,false],[142209,false],[142210,false],[142258,false],[142274,false],[142451,false],[142509,false],[142731,false],[142834,false],[143241,false],[143455,false],[143861,false],[143887,false],[145773,false],[146047,false],[146632,false],[148462,false],[148774,false],[148827,false],[148860,false],[148864,false],[148880,false],[149175,false],[149178,false],[149287,false],[149352,false],[149392,false],[149394,false],[149589,false],[149591,false],[149593,false],[149714,false],[149716,false],[149718,false],[149721,false],[149946,false],[149961,false],[149963,false],[149990,false],[150114,false],[150151,false],[150168,false],[150195,false],[150223,false],[150270,false],[150479,false],[150579,false],[150792,false],[150794,false],[150800,false],[150802,false],[150807,false],[150809,false],[150814,false],[150817,false],[150819,false],[150821,false],[150824,false],[150829,false],[150836,false],[151233,false],[151254,false],[151264,false],[151266,false],[151268,false],[151270,false],[151272,false],[151274,false],[151276,false],[151278,false],[151282,false],[151366,false],[151560,false]]]
            // logitBias=

        }
        else if(model.includes("llama-3.2")){
            orgin=[...orgin,...[[94,false],[95,false],[96,false],[97,false],[98,false],[99,false],[100,false],[101,false],[102,false],[103,false],[104,false],[105,false],[106,false],[107,false],[108,false],[109,false],[110,false],[111,false],[112,false],[113,false],[114,false],[115,false],[116,false],[117,false],[118,false],[119,false],[120,false],[121,false],[122,false],[123,false],[124,false],[125,false],[126,false],[127,false],[128,false],[129,false],[130,false],[131,false],[132,false],[133,false],[134,false],[135,false],[136,false],[137,false],[138,false],[139,false],[140,false],[141,false],[142,false],[143,false],[144,false],[145,false],[146,false],[147,false],[148,false],[149,false],[150,false],[151,false],[152,false],[153,false],[154,false],[155,false],[156,false],[157,false],[158,false],[159,false],[160,false],[161,false],[162,false],[163,false],[164,false],[165,false],[166,false],[167,false],[168,false],[169,false],[170,false],[171,false],[172,false],[173,false],[174,false],[175,false],[176,false],[177,false],[178,false],[179,false],[180,false],[181,false],[182,false],[183,false],[184,false],[185,false],[186,false],[187,false],[222,false],[223,false],[224,false],[225,false],[226,false],[227,false],[228,false],[229,false],[230,false],[231,false],[232,false],[233,false],[234,false],[235,false],[236,false],[237,false],[238,false],[239,false],[240,false],[241,false],[242,false],[243,false],[244,false],[245,false],[246,false],[247,false],[248,false],[249,false],[250,false],[251,false],[252,false],[253,false],[254,false],[255,false],[378,false],[639,false],[1300,false],[1301,false],[1569,false],[1717,false],[2188,false],[2243,false],[2275,false],[2845,false],[2928,false],[3098,false],[3299,false],[3396,false],[3484,false],[3574,false],[3732,false],[4268,false],[4916,false],[4996,false],[5080,false],[5251,false],[5619,false],[5681,false],[5877,false],[6026,false],[6079,false],[6271,false],[6655,false],[6701,false],[6704,false],[6708,false],[6744,false],[6823,false],[7190,false],[7305,false],[7459,false],[7518,false],[7644,false],[7688,false],[7741,false],[8008,false],[8067,false],[8192,false],[8239,false],[8321,false],[8676,false],[8687,false],[8790,false],[8979,false],[9015,false],[9019,false],[9085,false],[9212,false],[9444,false],[9468,false],[9921,false],[10044,false],[10287,false],[10414,false],[10447,false],[10634,false],[10890,false],[10997,false],[11001,false],[11239,false],[11372,false],[11410,false],[11589,false],[11743,false],[11795,false],[11881,false],[11882,false],[12264,false],[12554,false],[12774,false],[12870,false],[12906,false],[13079,false],[13357,false],[13393,false],[13467,false],[13647,false],[13773,false],[13821,false],[13828,false],[13841,false],[13870,false],[13879,false],[14167,false],[14191,false],[14276,false],[14309,false],[14608,false],[14705,false],[14806,false],[14860,false],[14888,false],[14901,false],[15017,false],[15269,false],[15272,false],[15284,false],[15291,false],[15308,false],[15355,false],[15478,false],[15568,false],[15581,false],[15722,false],[15755,false],[15973,false],[16050,false],[16175,false],[16205,false],[16275,false],[16281,false],[16306,false],[16555,false],[16633,false],[16906,false],[17044,false],[17164,false],[17169,false],[17196,false],[17245,false],[17486,false],[17597,false],[17599,false],[17732,false],[17839,false],[17857,false],[17885,false],[17920,false],[17925,false],[18049,false],[18107,false],[18202,false],[18259,false],[18550,false],[18630,false],[19012,false],[19044,false],[19097,false],[19630,false],[19658,false],[19817,false],[20022,false],[20033,false],[20119,false],[20135,false],[20321,false],[20541,false],[20551,false],[20627,false],[20648,false],[20701,false],[20740,false],[21007,false],[21105,false],[21370,false],[21403,false],[21441,false],[21549,false],[21555,false],[21589,false],[21688,false],[21784,false],[21819,false],[21980,false],[22254,false],[22289,false],[22447,false],[22605,false],[22783,false],[22817,false],[22914,false],[23043,false],[23419,false],[23436,false],[23602,false],[23706,false],[23964,false],[24153,false],[24326,false],[24339,false],[24615,false],[24715,false],[24814,false],[24839,false],[25005,false],[25010,false],[25038,false],[25132,false],[25190,false],[25340,false],[25451,false],[25493,false],[25766,false],[25781,false],[25870,false],[25906,false],[26062,false],[26182,false],[26203,false],[26274,false],[26530,false],[26602,false],[26787,false],[26856,false],[26955,false],[27006,false],[27017,false],[27280,false],[27350,false],[27433,false],[27552,false],[27623,false],[27699,false],[27869,false],[27951,false],[28025,false],[28194,false],[28308,false],[28313,false],[28359,false],[28425,false],[28498,false],[28587,false],[28617,false],[28638,false],[28740,false],[28857,false],[28867,false],[29082,false],[29099,false],[29207,false],[29245,false],[29753,false],[29857,false],[30027,false],[30250,false],[30320,false],[30337,false],[30489,false],[30775,false],[30868,false],[31041,false],[31055,false],[31075,false],[31106,false],[31374,false],[31495,false],[31584,false],[31620,false],[31928,false],[31938,false],[32016,false],[32386,false],[32405,false],[32438,false],[32511,false],[32582,false],[32601,false],[33281,false],[33308,false],[33354,false],[33443,false],[33565,false],[33595,false],[33943,false],[34026,false],[34085,false],[34273,false],[34452,false],[34524,false],[34643,false],[34656,false],[34693,false],[34839,false],[35086,false],[35243,false],[35469,false],[35510,false],[35529,false],[35677,false],[35722,false],[35729,false],[35859,false],[35911,false],[36092,false],[36117,false],[36149,false],[36155,false],[36225,false],[36246,false],[36278,false],[36393,false],[36458,false],[36596,false],[36735,false],[36820,false],[37197,false],[37209,false],[37430,false],[37648,false],[37769,false],[37777,false],[37795,false],[38078,false],[38164,false],[38248,false],[38295,false],[38389,false],[38540,false],[38572,false],[38609,false],[38798,false],[39013,false],[39277,false],[39519,false],[39533,false],[39622,false],[39623,false],[40003,false],[40011,false],[40198,false],[40275,false],[40417,false],[40466,false],[40934,false],[41519,false],[41766,false],[41814,false],[41832,false],[41847,false],[41871,false],[42579,false],[43002,false],[43244,false],[43336,false],[43411,false],[43576,false],[43949,false],[44510,false],[44559,false],[44647,false],[44659,false],[44714,false],[44816,false],[44820,false],[44852,false],[45114,false],[45144,false],[45154,false],[45204,false],[45358,false],[45501,false],[45780,false],[45806,false],[45826,false],[45918,false],[45932,false],[45934,false],[45951,false],[46065,false],[46204,false],[46230,false],[46413,false],[46981,false],[47118,false],[47318,false],[47382,false],[47453,false],[47600,false],[47702,false],[47850,false],[47900,false],[47932,false],[47971,false],[48478,false],[48479,false],[48555,false],[48765,false],[49011,false],[49072,false],[49208,false],[49412,false],[49464,false],[49558,false],[49633,false],[49691,false],[49849,false],[49854,false],[49900,false],[49940,false],[50228,false],[50266,false],[50273,false],[50520,false],[50534,false],[50702,false],[51043,false],[51202,false],[51211,false],[51462,false],[52188,false],[52375,false],[52514,false],[52561,false],[52597,false],[53233,false],[53508,false],[53606,false],[53898,false],[53906,false],[53987,false],[54125,false],[54596,false],[54597,false],[54656,false],[54699,false],[55089,false],[55228,false],[55570,false],[55592,false],[55699,false],[55742,false],[55799,false],[55884,false],[56055,false],[56159,false],[56829,false],[56938,false],[56990,false],[57352,false],[57923,false],[57942,false],[58233,false],[58254,false],[58260,false],[58699,false],[58843,false],[59198,false],[59269,false],[59308,false],[59330,false],[59399,false],[59564,false],[59622,false],[59657,false],[59815,false],[59999,false],[60094,false],[60153,false],[60239,false],[61696,false],[61727,false],[61857,false],[61964,false],[62085,false],[62717,false],[62904,false],[63105,false],[63199,false],[63516,false],[63644,false],[63718,false],[63840,false],[63923,false],[64139,false],[64146,false],[64319,false],[64500,false],[64861,false],[65488,false],[65620,false],[65905,false],[65993,false],[66285,false],[66297,false],[66391,false],[66556,false],[66619,false],[66653,false],[66799,false],[66822,false],[66827,false],[66950,false],[66977,false],[67218,false],[67361,false],[67598,false],[67621,false],[67735,false],[68995,false],[69272,false],[69350,false],[69394,false],[69398,false],[69505,false],[69533,false],[69697,false],[69839,false],[70041,false],[70133,false],[70292,false],[70482,false],[70483,false],[70541,false],[70787,false],[70892,false],[71279,false],[71397,false],[71567,false],[71685,false],[71697,false],[71831,false],[72406,false],[72543,false],[72581,false],[73028,false],[73033,false],[73136,false],[73319,false],[73444,false],[73596,false],[73597,false],[73609,false],[73673,false],[74247,false],[75265,false],[75309,false],[75461,false],[75677,false],[75966,false],[75984,false],[76207,false],[76232,false],[76242,false],[76460,false],[76475,false],[76698,false],[76771,false],[77062,false],[77180,false],[77597,false],[78052,false],[78086,false],[78147,false],[78237,false],[78256,false],[78507,false],[78696,false],[80010,false],[80071,false],[80242,false],[80307,false],[80402,false],[80426,false],[80527,false],[80631,false],[80690,false],[80721,false],[80979,false],[80988,false],[81180,false],[81190,false],[81278,false],[81802,false],[82350,false],[83042,false],[83601,false],[83806,false],[83812,false],[83898,false],[84012,false],[84102,false],[84150,false],[84264,false],[84291,false],[84326,false],[84743,false],[84949,false],[85241,false],[85300,false],[85315,false],[85338,false],[85663,false],[85667,false],[85805,false],[86513,false],[86894,false],[87189,false],[87743,false],[88399,false],[89059,false],[89641,false],[90040,false],[90161,false],[90183,false],[90195,false],[90279,false],[90397,false],[90463,false],[90534,false],[91576,false],[91657,false],[91739,false],[91779,false],[91811,false],[91834,false],[91939,false],[91994,false],[92148,false],[92150,false],[92871,false],[92988,false],[93220,false],[93273,false],[93287,false],[94278,false],[94355,false],[94537,false],[95020,false],[95405,false],[95591,false],[95925,false],[96064,false],[96169,false],[96311,false],[96622,false],[96841,false],[97255,false],[97908,false],[98038,false],[98115,false],[98272,false],[98359,false],[98629,false],[99046,false],[99413,false],[99742,false],[99834,false],[100112,false],[100256,false],[100257,false],[100258,false],[100261,false],[100262,false],[100263,false],[100265,false],[100289,false],[100290,false],[100309,false],[100310,false],[100313,false],[100371,false],[100382,false],[100383,false],[100389,false],[100401,false],[100452,false],[100458,false],[100465,false],[100479,false],[100487,false],[100499,false],[100514,false],[100525,false],[100529,false],[100543,false],[100554,false],[100560,false],[100570,false],[100571,false],[100593,false],[100602,false],[100617,false],[100646,false],[100701,false],[100702,false],[100756,false],[100757,false],[100762,false],[100763,false],[100773,false],[100783,false],[100795,false],[100796,false],[100818,false],[100844,false],[100845,false],[100853,false],[100859,false],[100938,false],[100950,false],[100966,false],[100990,false],[100992,false],[101012,false],[101037,false],[101042,false],[101057,false],[101065,false],[101085,false],[101128,false],[101161,false],[101168,false],[101171,false],[101187,false],[101197,false],[101211,false],[101219,false],[101223,false],[101253,false],[101268,false],[101274,false],[101310,false],[101350,false],[101355,false],[101363,false],[101370,false],[101389,false],[101392,false],[101413,false],[101427,false],[101443,false],[101445,false],[101457,false],[101462,false],[101477,false],[101497,false],[101519,false],[101523,false],[101557,false],[101560,false],[101563,false],[101571,false],[101576,false],[101583,false],[101658,false],[101694,false],[101712,false],[101714,false],[101734,false],[101762,false],[101790,false],[101792,false],[101805,false],[101814,false],[101837,false],[101851,false],[101862,false],[101890,false],[101921,false],[101960,false],[102008,false],[102032,false],[102048,false],[102057,false],[102068,false],[102147,false],[102227,false],[102236,false],[102246,false],[102266,false],[102267,false],[102319,false],[102333,false],[102370,false],[102374,false],[102384,false],[102448,false],[102457,false],[102508,false],[102526,false],[102535,false],[102542,false],[102558,false],[102601,false],[102708,false],[102729,false],[102732,false],[102735,false],[102754,false],[102783,false],[102794,false],[102821,false],[102839,false],[102853,false],[102958,false],[102966,false],[103001,false],[103013,false],[103043,false],[103067,false],[103148,false],[103180,false],[103198,false],[103206,false],[103222,false],[103230,false],[103241,false],[103273,false],[103298,false],[103345,false],[103346,false],[103402,false],[103423,false],[103433,false],[103435,false],[103462,false],[103480,false],[103497,false],[103553,false],[103557,false],[103558,false],[103590,false],[103593,false],[103618,false],[103667,false],[103721,false],[103773,false],[103802,false],[103809,false],[103842,false],[103850,false],[103858,false],[103872,false],[103879,false],[103885,false],[103897,false],[103952,false],[103965,false],[103990,false],[104037,false],[104074,false],[104102,false],[104137,false],[104145,false],[104207,false],[104217,false],[104227,false],[104238,false],[104247,false],[104258,false],[104340,false],[104351,false],[104354,false],[104381,false],[104467,false],[104519,false],[104553,false],[104626,false],[104637,false],[104645,false],[104694,false],[104735,false],[104738,false],[104759,false],[104789,false],[104799,false],[104812,false],[104814,false],[104828,false],[104849,false],[104921,false],[104944,false],[104974,false],[105017,false],[105037,false],[105098,false],[105120,false],[105126,false],[105136,false],[105143,false],[105194,false],[105214,false],[105338,false],[105357,false],[105382,false],[105394,false],[105402,false],[105432,false],[105444,false],[105490,false],[105505,false],[105522,false],[105547,false],[105588,false],[105623,false],[105656,false],[105682,false],[105694,false],[105697,false],[105742,false],[105750,false],[105863,false],[105864,false],[105897,false],[105911,false],[105940,false],[106007,false],[106036,false],[106076,false],[106101,false],[106181,false],[106198,false],[106217,false],[106235,false],[106278,false],[106301,false],[106347,false],[106410,false],[106454,false],[106459,false],[106509,false],[106536,false],[106562,false],[106564,false],[106623,false],[106631,false],[106665,false],[106717,false],[106782,false],[106793,false],[106890,false],[106911,false],[106925,false],[106955,false],[106984,false],[106986,false],[106992,false],[107023,false],[107040,false],[107049,false],[107063,false],[107090,false],[107117,false],[107139,false],[107142,false],[107194,false],[107218,false],[107235,false],[107280,false],[107292,false],[107399,false],[107429,false],[107443,false],[107454,false],[107494,false],[107569,false],[107677,false],[107686,false],[107710,false],[107722,false],[107745,false],[107798,false],[107820,false],[107860,false],[107879,false],[107893,false],[107929,false],[107934,false],[107964,false],[108005,false],[108061,false],[108119,false],[108138,false],[108160,false],[108166,false],[108220,false],[108244,false],[108269,false],[108333,false],[108341,false],[108366,false],[108376,false],[108419,false],[108425,false],[108477,false],[108575,false],[108587,false],[108607,false],[108834,false],[108837,false],[108864,false],[109049,false],[109056,false],[109147,false],[109158,false],[109261,false],[109293,false],[109304,false],[109349,false],[109455,false],[109478,false],[109481,false],[109517,false],[109526,false],[109546,false],[109633,false],[109649,false],[109697,false],[109778,false],[109864,false],[109897,false],[110124,false],[110203,false],[110233,false],[110329,false],[110347,false],[110385,false],[110453,false],[110502,false],[110523,false],[110544,false],[110565,false],[110606,false],[110646,false],[110680,false],[110771,false],[110838,false],[110848,false],[110909,false],[110936,false],[110937,false],[110944,false],[110972,false],[111020,false],[111023,false],[111092,false],[111109,false],[111292,false],[111335,false],[111345,false],[111368,false],[111370,false],[111549,false],[111584,false],[111648,false],[111699,false],[111704,false],[111896,false],[111909,false],[111930,false],[111963,false],[111972,false],[112039,false],[112045,false],[112086,false],[112170,false],[112200,false],[112243,false],[112245,false],[112258,false],[112351,false],[112362,false],[112399,false],[112417,false],[112451,false],[112470,false],[112558,false],[112606,false],[112722,false],[112731,false],[112800,false],[112865,false],[112934,false],[113010,false],[113168,false],[113204,false],[113222,false],[113347,false],[113375,false],[113384,false],[113566,false],[113594,false],[113604,false],[113752,false],[113851,false],[114114,false],[114125,false],[114201,false],[114203,false],[114292,false],[114354,false],[114417,false],[114431,false],[114450,false],[114503,false],[114617,false],[114769,false],[114783,false],[114898,false],[115003,false],[115064,false],[115100,false],[115175,false],[115189,false],[115328,false],[115468,false],[115581,false],[115594,false],[115617,false],[115740,false],[115799,false],[115833,false],[115861,false],[116041,false],[116115,false],[116131,false],[116195,false],[116196,false],[116201,false],[116209,false],[116231,false],[116489,false],[116649,false],[116741,false],[116747,false],[116804,false],[116808,false],[116814,false],[116990,false],[117067,false],[117190,false],[117261,false],[117262,false],[117411,false],[117482,false],[117484,false],[117523,false],[117580,false],[117653,false],[117917,false],[117953,false],[118047,false],[118083,false],[118360,false],[118375,false],[118807,false],[119235,false],[119410,false],[119487,false],[119611,false],[119786,false],[119848,false],[119969,false],[120066,false],[120153,false],[120355,false],[120388,false],[120635,false],[120657,false],[120801,false],[120912,false],[121077,false],[121151,false],[121306,false],[121390,false],[121497,false],[121533,false],[121586,false],[121785,false],[121881,false],[121882,false],[122075,false],[122076,false],[122160,false],[122175,false],[122226,false],[122252,false],[122266,false],[122311,false],[122586,false],[122704,false],[122723,false],[122738,false],[122828,false],[122901,false],[123143,false],[123225,false],[123252,false],[123375,false],[123451,false],[123585,false],[123768,false],[123778,false],[123903,false],[124022,false],[124053,false],[124066,false],[124692,false],[124761,false],[124797,false],[124805,false],[124928,false],[124934,false],[125099,false],[125149,false],[125483,false],[125613,false],[125705,false],[125746,false],[125799,false],[125820,false],[125825,false],[125906,false],[126058,false],[126176,false],[126293,false],[126443,false],[126743,false],[127038,false],[127039,false],[127437,false],[127451,false],[127467,false],[127587,false],[127771,false],[127802,false],[127815,false],]];
            for(let i=128000;i<=128255;i++)
                orgin.push([i,false]);//全是空字符串？
        }// else console.log(model)
    }
    catch{
        console.clear();
    }
    return orgin;
}
export function toBinary(bytes){
    let base2=[];
    for (let b of bytes) {
        for(let i=7;i>=0;i--){
            base2.push(b>>i & 0x01);
        }
    }
    return base2;
}
export function toBytes(base){
    let bytes = new Uint8Array(base.length/8);let k=0;
    for(let i=0;i<base.length;i+=8){
        bytes[k++]=base[i]*128+base[i+1]*64+base[i+2]*32+base[i+3]*16+base[i+4]*8+base[i+5]*4+base[i+6]*2+base[i+7];
    }
    return bytes;
}
function isInvisibleChar(codePoint) {
    // 1. 控制字符 (C0 和 C1 控制字符, U+0000 到 U+001F, U+007F 到 U+009F)
    if ((codePoint >= 0x0000 && codePoint <= 0x001F) || (codePoint >= 0x007F && codePoint <= 0x009F)) {
        return true;
    }

    // 2. 零宽字符
    const zeroWidthChars = [
        0x200B, // 零宽空格 (Zero Width Space)
        0x200C, // 零宽非连接符 (Zero Width Non-Joiner)
        0x200D, // 零宽连接符 (Zero Width Joiner)
        0xFEFF, // 零宽非换行空格 (Zero Width No-Break Space, 也叫 BOM)
    ];
    if (zeroWidthChars.includes(codePoint)) {
        return true;
    }

    // 3. 其他格式字符 (Unicode 类别 Cf)
    const formatChars = [
        0x00AD, // 软连字符 (Soft Hyphen)
        0x2060, // 单词连接符 (Word Joiner)
        0x2061, // 函数应用 (Function Application)
        0x2062, // 不可见乘号 (Invisible Times)
        0x2063, // 不可见分隔符 (Invisible Separator)
        0x2064, // 不可见加号 (Invisible Plus)
    ];
    if (formatChars.includes(codePoint)) {
        return true;
    }

    // 4. 其他不可见字符范围
    const invisibleRanges = [
        [0x200E, 0x200F], // 左至右标记 (Left-to-Right Mark), 右至左标记 (Right-to-Left Mark)
        [0x202A, 0x202E], // 嵌入和覆盖标记 (Left-to-Right Embedding, etc.)
        [0x2066, 0x206F], // 隔离和禁止标记 (Left-to-Right Isolate, etc.)
    ];
    for (const [start, end] of invisibleRanges) {
        if (codePoint >= start && codePoint <= end) {
            return true;
        }
    }
    return false;
}
export function containsInvisibleChar(str) {
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        // 零宽字符
        if (
            code === 0x200B || // Zero Width Space
            code === 0x200C || // Zero Width Non-Joiner
            code === 0x200D || // Zero Width Joiner
            code === 0xFEFF    // Zero Width No-Break Space
        ) {
            return true;
        }

        // 控制字符（排除常见空白符：\t, \n, \r）
        if (code < 0x20 && ![0x09, 0x0A, 0x0D].includes(code)) {
            return true;
        }

        // DEL 字符
        if (code === 0x7F) {
            return true;
        }
    }

    return false;
}
export function findSublistIndex(mainList, subList) {
    const subListLength = subList.length;
    for (let i = 0; i <= mainList.length - subListLength; i++) {
        const slice = mainList.slice(i, i + subListLength);
        if (slice.every((item, index) => item === subList[index])) {
            return i; // 返回子列表的起始索引
        }
    }
    return -1; // 如果没有找到，返回 -1
}
export function stringToUnicode(str) {
    return Array.from(str)
        .map(char => {
            // 获取字符的代码点
            const codePoint = char.codePointAt(0);
            // 转为16进制并补齐
            const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
            return '\\u' + hex;
        })
        .join('');
}