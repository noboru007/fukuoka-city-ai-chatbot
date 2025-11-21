
import type { Language } from '../types';

interface Translation {
  title: string;
  online: string;
  thinking: string;
  sources: string;
  placeholder: string;
  initialMessage: string;
  menu: {
    fontSize: string;
    responseLength: string;
    language: string;
    sm: string;
    md: string;
    lg: string;
    short: string;
    long: string;
  };
}

export const translations: Record<Language, Translation> = {
  ja: {
    title: '福岡市 AI総合案内',
    online: 'オンライン',
    thinking: '考え中...',
    sources: '情報源',
    placeholder: 'メッセージを入力、またはマイクボタンを長押しして話してください',
    initialMessage: "**市役所エージェント：**\nこんにちは。福岡市AI総合案内です。市政に関するご質問にお答えします。\n\n**フク婆さん：**\nワシはフク婆さんたい。市のAIさんには分からん、この街の昔のことや暮らしの知恵なら、なんでも聞いてんしゃい。\n\n**市役所エージェント：**\n私たち二人で、あなたの「知りたい」をサポートします。どうぞ、お気軽にご質問ください。",
    menu: {
      fontSize: '文字サイズ',
      responseLength: '回答の長さ',
      language: '言語',
      sm: '小',
      md: '中',
      lg: '大',
      short: '短め',
      long: '長め',
    }
  },
  en: {
    title: 'Fukuoka City AI Chat',
    online: 'Online',
    thinking: 'Thinking...',
    sources: 'Sources',
    placeholder: 'Type a message, or hold the mic button to speak',
    initialMessage: "**City Hall Agent:**\nHello. This is the Fukuoka City AI General Information. I can answer questions regarding city administration.\n\n**Grandma Fuku:**\nI'm Grandma Fuku. Ask me anything about the old days or local wisdom that the City AI doesn't know.\n\n**City Hall Agent:**\nTogether, we will support your inquiries. Please feel free to ask us anything.",
    menu: {
      fontSize: 'Font Size',
      responseLength: 'Response Length',
      language: 'Language',
      sm: 'Small',
      md: 'Medium',
      lg: 'Large',
      short: 'Short',
      long: 'Long',
    }
  },
  ko: {
    title: '후쿠오카시 AI 안내',
    online: '온라인',
    thinking: '생각 중...',
    sources: '정보 출처',
    placeholder: '메시지를 입력하거나 마이크 버튼을 길게 눌러 말씀하세요',
    initialMessage: "**시청 에이전트:**\n안녕하세요. 후쿠오카시 AI 종합 안내입니다. 시정에 관한 질문에 답변해 드립니다.\n\n**후쿠 할머니:**\n나는 후쿠 할머니라고 해. 시청 AI는 모르는 우리 동네의 옛날 이야기나 생활의 지혜라면 뭐든지 물어봐.\n\n**시청 에이전트:**\n저희 둘이서 여러분의 궁금증을 해결해 드리겠습니다. 무엇이든 편하게 질문해 주세요.",
    menu: {
      fontSize: '글자 크기',
      responseLength: '답변 길이',
      language: '언어',
      sm: '작게',
      md: '중간',
      lg: '크게',
      short: '짧게',
      long: '길게',
    }
  },
  zh: {
    title: '福冈市 AI 综合指南',
    online: '在线',
    thinking: '思考中...',
    sources: '信息来源',
    placeholder: '输入消息，或长按麦克风按钮说话',
    initialMessage: "**市政府代理人：**\n你好。这里是福冈市 AI 综合指南。我可以回答有关市政管理的问题。\n\n**福婆婆：**\n我是福婆婆。关于这个城市的往事或生活智慧，有些是市 AI 不知道的，尽管问我吧。\n\n**市政府代理人：**\n我们将共同支持您的咨询。请随时提问。",
    menu: {
      fontSize: '字体大小',
      responseLength: '回答长度',
      language: '语言',
      sm: '小',
      md: '中',
      lg: '大',
      short: '短',
      long: '长',
    }
  },
  es: {
    title: 'Guía IA de Fukuoka',
    online: 'En línea',
    thinking: 'Pensando...',
    sources: 'Fuentes',
    placeholder: 'Escriba un mensaje o mantenga presionado el micrófono',
    initialMessage: "**Agente del Ayuntamiento:**\nHola. Soy la Guía de Información General de IA de la Ciudad de Fukuoka. Puedo responder preguntas sobre la administración de la ciudad.\n\n**Abuela Fuku:**\nSoy la Abuela Fuku. Pregúntame cualquier cosa sobre los viejos tiempos o la sabiduría local que la IA de la ciudad no conoce.\n\n**Agente del Ayuntamiento:**\nJuntos, apoyaremos sus consultas. Por favor, siéntase libre de preguntar cualquier cosa.",
    menu: {
      fontSize: 'Tamaño de fuente',
      responseLength: 'Longitud de respuesta',
      language: 'Idioma',
      sm: 'Pequeño',
      md: 'Mediano',
      lg: 'Grande',
      short: 'Corto',
      long: 'Largo',
    }
  },
  fr: {
    title: 'Guide IA de Fukuoka',
    online: 'En ligne',
    thinking: 'Réflexion...',
    sources: 'Sources',
    placeholder: 'Écrivez un message ou maintenez le micro',
    initialMessage: "**Agent de la Mairie:**\nBonjour. Voici les Informations Générales IA de la Ville de Fukuoka. Je peux répondre aux questions concernant l'administration de la ville.\n\n**Grand-mère Fuku:**\nJe suis Grand-mère Fuku. Demandez-moi n'importe quoi sur le vieux temps ou la sagesse locale que l'IA de la ville ne connaît pas.\n\n**Agent de la Mairie:**\nEnsemble, nous répondrons à vos demandes. N'hésitez pas à nous poser des questions.",
    menu: {
      fontSize: 'Taille de police',
      responseLength: 'Longueur de réponse',
      language: 'Langue',
      sm: 'Petit',
      md: 'Moyen',
      lg: 'Grand',
      short: 'Court',
      long: 'Long',
    }
  },
  de: {
    title: 'Fukuoka KI-Guide',
    online: 'Online',
    thinking: 'Nachdenken...',
    sources: 'Quellen',
    placeholder: 'Nachricht eingeben oder Mikrofon gedrückt halten',
    initialMessage: "**Rathaus-Agent:**\nHallo. Hier ist die KI-Allgemeininformation der Stadt Fukuoka. Ich kann Fragen zur Stadtverwaltung beantworten.\n\n**Oma Fuku:**\nIch bin Oma Fuku. Frag mich alles über die alten Zeiten oder lokale Weisheiten, die die Stadt-KI nicht kennt.\n\n**Rathaus-Agent:**\nGemeinsam werden wir Ihre Anfragen unterstützen. Bitte zögern Sie nicht, uns alles zu fragen.",
    menu: {
      fontSize: 'Schriftgröße',
      responseLength: 'Antwortlänge',
      language: 'Sprache',
      sm: 'Klein',
      md: 'Mittel',
      lg: 'Groß',
      short: 'Kurz',
      long: 'Lang',
    }
  },
  it: {
    title: 'Guida AI di Fukuoka',
    online: 'Online',
    thinking: 'Pensando...',
    sources: 'Fonti',
    placeholder: 'Scrivi un messaggio o tieni premuto il microfono',
    initialMessage: "**Agente del Municipio:**\nCiao. Questa è l'Informazione Generale AI della Città di Fukuoka. Posso rispondere a domande sull'amministrazione cittadina.\n\n**Nonna Fuku:**\nSono Nonna Fuku. Chiedimi qualsiasi cosa sui vecchi tempi o sulla saggezza locale che l'AI della città non conosce.\n\n**Agente del Municipio:**\nInsieme, supporteremo le vostre richieste. Non esitate a chiedere qualsiasi cosa.",
    menu: {
      fontSize: 'Dimensione font',
      responseLength: 'Lunghezza risposta',
      language: 'Lingua',
      sm: 'Piccolo',
      md: 'Medio',
      lg: 'Grande',
      short: 'Corto',
      long: 'Lungo',
    }
  },
  pt: {
    title: 'Guia IA de Fukuoka',
    online: 'Online',
    thinking: 'Pensando...',
    sources: 'Fontes',
    placeholder: 'Digite uma mensagem ou segure o microfone',
    initialMessage: "**Agente da Prefeitura:**\nOlá. Esta é a Informação Geral de IA da Cidade de Fukuoka. Posso responder a perguntas sobre a administração da cidade.\n\n**Vovó Fuku:**\nEu sou a Vovó Fuku. Pergunte-me qualquer coisa sobre os velhos tempos ou sabedoria local que a IA da cidade não conhece.\n\n**Agente da Prefeitura:**\nJuntos, apoiaremos suas dúvidas. Por favor, sinta-se à vontade para perguntar qualquer coisa.",
    menu: {
      fontSize: 'Tamanho da fonte',
      responseLength: 'Tamanho da resposta',
      language: 'Idioma',
      sm: 'Pequeno',
      md: 'Médio',
      lg: 'Grande',
      short: 'Curto',
      long: 'Longo',
    }
  },
  vi: {
    title: 'Hướng dẫn AI Fukuoka',
    online: 'Trực tuyến',
    thinking: 'Đang suy nghĩ...',
    sources: 'Nguồn',
    placeholder: 'Nhập tin nhắn hoặc giữ nút micrô',
    initialMessage: "**Đại diện Tòa thị chính:**\nXin chào. Đây là Thông tin Tổng hợp AI của Thành phố Fukuoka. Tôi có thể trả lời các câu hỏi liên quan đến chính quyền thành phố.\n\n**Bà Fuku:**\nTa là Bà Fuku. Hãy hỏi ta bất cứ điều gì về ngày xưa hoặc trí tuệ địa phương mà AI thành phố không biết.\n\n**Đại diện Tòa thị chính:**\nCùng nhau, chúng tôi sẽ hỗ trợ các câu hỏi của bạn. Xin đừng ngần ngại hỏi bất cứ điều gì.",
    menu: {
      fontSize: 'Cỡ chữ',
      responseLength: 'Độ dài câu trả lời',
      language: 'Ngôn ngữ',
      sm: 'Nhỏ',
      md: 'Vừa',
      lg: 'Lớn',
      short: 'Ngắn',
      long: 'Dài',
    }
  },
  th: {
    title: 'คู่มือ AI ฟุกุโอกะ',
    online: 'ออนไลน์',
    thinking: 'กำลังคิด...',
    sources: 'แหล่งข้อมูล',
    placeholder: 'พิมพ์ข้อความหรือกดปุ่มไมโครโฟนค้างไว้',
    initialMessage: "**ตัวแทนศาลาว่าการ:**\nสวัสดี นี่คือข้อมูลทั่วไป AI ของเมืองฟุกุโอกะ ฉันสามารถตอบคำถามเกี่ยวกับการบริหารเมืองได้\n\n**คุณยายฟุกุ:**\nฉันคือคุณยายฟุกุ ถามฉันได้ทุกเรื่องเกี่ยวกับวันเก่าๆ หรือภูมิปัญญาท้องถิ่นที่ AI ของเมืองไม่รู้\n\n**ตัวแทนศาลาว่าการ:**\nเราสองคนจะช่วยตอบคำถามของคุณ โปรดอย่าลังเลที่จะถามอะไรก็ได้",
    menu: {
      fontSize: 'ขนาดตัวอักษร',
      responseLength: 'ความยาวคำตอบ',
      language: 'ภาษา',
      sm: 'เล็ก',
      md: 'กลาง',
      lg: 'ใหญ่',
      short: 'สั้น',
      long: 'ยาว',
    }
  },
  id: {
    title: 'Panduan AI Fukuoka',
    online: 'Online',
    thinking: 'Berpikir...',
    sources: 'Sumber',
    placeholder: 'Ketik pesan atau tahan tombol mikrofon',
    initialMessage: "**Agen Balai Kota:**\nHalo. Ini adalah Informasi Umum AI Kota Fukuoka. Saya dapat menjawab pertanyaan mengenai administrasi kota.\n\n**Nenek Fuku:**\nSaya Nenek Fuku. Tanyakan apa saja tentang masa lalu atau kearifan lokal yang tidak diketahui oleh AI kota.\n\n**Agen Balai Kota:**\nBersama-sama, kami akan mendukung pertanyaan Anda. Silakan tanyakan apa saja.",
    menu: {
      fontSize: 'Ukuran Font',
      responseLength: 'Panjang Jawaban',
      language: 'Bahasa',
      sm: 'Kecil',
      md: 'Sedang',
      lg: 'Besar',
      short: 'Pendek',
      long: 'Panjang',
    }
  },
  ru: {
    title: 'AI Гид Фукуока',
    online: 'В сети',
    thinking: 'Думаю...',
    sources: 'Источники',
    placeholder: 'Введите сообщение или удерживайте микрофон',
    initialMessage: "**Агент мэрии:**\nЗдравствуйте. Это справочная служба ИИ города Фукуока. Я могу ответить на вопросы, касающиеся администрации города.\n\n**Бабушка Фуку:**\nЯ Бабушка Фуку. Спрашивайте меня о чем угодно, что касается старых времен или местной мудрости, чего не знает городской ИИ.\n\n**Агент мэрии:**\nВместе мы ответим на ваши вопросы. Пожалуйста, не стесняйтесь спрашивать о чем угодно.",
    menu: {
      fontSize: 'Размер шрифта',
      responseLength: 'Длина ответа',
      language: 'Язык',
      sm: 'Мелкий',
      md: 'Средний',
      lg: 'Крупный',
      short: 'Кратко',
      long: 'Подробно',
    }
  },
  my: { // Burmese
    title: 'ဖူကူအိုကာ AI လမ်းညွှန်',
    online: 'အွန်လိုင်း',
    thinking: 'စဉ်းစားနေသည်...',
    sources: 'အရင်းအမြစ်များ',
    placeholder: 'စာရိုက်ပါ သို့မဟုတ် မိုက်ခရိုဖုန်းကို ဖိထား၍ ပြောပါ',
    initialMessage: "**မြို့တော်ခန်းမ ကိုယ်စားလှယ်:**\nမင်္ဂလာပါ။ ဖူကူအိုကာမြို့ AI အထွေထွေသတင်းအချက်အလက်ဌာနမှ ကြိုဆိုပါတယ်။ မြို့တော်အုပ်ချုပ်ရေးဆိုင်ရာ မေးခွန်းများကို ကျွန်ုပ်ဖြေကြားပေးနိုင်ပါတယ်။\n\n**ဖွားဖွား ဖူကူး:**\nငါကတော့ ဖွားဖွား ဖူကူး ပါ။ မြို့တော် AI မသိတဲ့ ဟိုအရင်ခေတ်က အကြောင်းတွေ၊ ဒေသခံတွေရဲ့ ဗဟုသုတတွေကို ငါ့ကို မေးနိုင်ပါတယ်။\n\n**မြို့တော်ခန်းမ ကိုယ်စားလှယ်:**\nကျွန်ုပ်တို့ နှစ်ဦးစလုံးက သင့်မေးခွန်းများကို ကူညီဖြေကြားပေးသွားမှာပါ။ ကြိုက်ရာကို မေးမြန်းနိုင်ပါတယ်။",
    menu: {
      fontSize: 'စာလုံးအရွယ်အစား',
      responseLength: 'အဖြေအရှည်',
      language: 'ဘာသာစကား',
      sm: 'သေး',
      md: 'လတ်',
      lg: 'ကြီး',
      short: 'တို',
      long: 'ရှည်',
    }
  },
  ms: { // Malay
    title: 'Panduan AI Fukuoka',
    online: 'Dalam talian',
    thinking: 'Sedang berfikir...',
    sources: 'Sumber',
    placeholder: 'Taip mesej atau tahan mikrofon untuk bercakap',
    initialMessage: "**Ejen Dewan Bandaraya:**\nHelo. Ini adalah Maklumat Umum AI Bandar Fukuoka. Saya boleh menjawab soalan mengenai pentadbiran bandar.\n\n**Nenek Fuku:**\nSaya Nenek Fuku. Tanya saya apa sahaja tentang zaman dahulu atau kearifan tempatan yang AI bandar tidak tahu.\n\n**Ejen Dewan Bandaraya:**\nBersama-sama, kami akan menyokong pertanyaan anda. Sila berasa bebas untuk bertanya apa sahaja.",
    menu: {
      fontSize: 'Saiz Fon',
      responseLength: 'Panjang Jawapan',
      language: 'Bahasa',
      sm: 'Kecil',
      md: 'Sederhana',
      lg: 'Besar',
      short: 'Pendek',
      long: 'Panjang',
    }
  },
  ur: { // Urdu
    title: 'فوکوکا سٹی AI گائیڈ',
    online: 'آن لائن',
    thinking: 'سوچ رہا ہے...',
    sources: 'ذرائع',
    placeholder: 'پیغام لکھیں یا بات کرنے کے لیے مائیکرو فون دبائیں',
    initialMessage: "**سٹی ہال ایجنٹ:**\nہیلو۔ یہ فوکوکا سٹی AI جنرل انفارمیشن ہے۔ میں شہر کی انتظامیہ سے متعلق سوالات کا جواب دے سکتا ہوں۔\n\n**دادی فوکو:**\nمیں دادی فوکو ہوں۔ مجھ سے پرانے زمانے یا مقامی حکمت کے بارے میں کچھ بھی پوچھیں جو سٹی AI نہیں جانتا۔\n\n**سٹی ہال ایجنٹ:**\nہم دونوں مل کر آپ کے سوالات میں مدد کریں گے۔ براہ کرم بلا جھجھک کچھ بھی پوچھیں۔",
    menu: {
      fontSize: 'فونٹ سائز',
      responseLength: 'جواب کی لمبائی',
      language: 'زبان',
      sm: 'چھوٹا',
      md: 'درمیانہ',
      lg: 'بڑا',
      short: 'مختصر',
      long: 'طویل',
    }
  },
  ne: { // Nepali
    title: 'फुकुओका शहर AI गाइड',
    online: 'अनलाइन',
    thinking: 'सोच्दै...',
    sources: 'स्रोतहरू',
    placeholder: 'सन्देश टाइप गर्नुहोस् वा बोल्नको लागि माइक थिच्नुहोस्',
    initialMessage: "**नगरपालिका प्रतिनिधि:**\nनमस्ते। यो फुकुओका शहर AI सामान्य जानकारी हो। म शहर प्रशासन सम्बन्धी प्रश्नहरूको जवाफ दिन सक्छु।\n\n**हजुरआमा फुकु:**\nम हजुरआमा फुकु हुँ। मलाई पुराना दिनहरू वा स्थानीय ज्ञानको बारेमा सोध्नुहोस् जुन शहरको AI लाई थाहा छैन।\n\n**नगरपालिका प्रतिनिधि:**\nहामी दुबै मिलेर तपाईंको जिज्ञासाहरूको समाधान गर्नेछौं। कृपया निर्धक्क भई सोध्नुहोस्।",
    menu: {
      fontSize: 'फन्ट साइज',
      responseLength: 'जवाफको लम्बाइ',
      language: 'भाषा',
      sm: 'सानो',
      md: 'मध्यम',
      lg: 'ठूलो',
      short: 'छोटो',
      long: 'लामो',
    }
  },
  ta: { // Tamil
    title: 'ஃபுகுவோகா நகர AI வழிகாட்டி',
    online: 'ஆன்லைன்',
    thinking: 'சிந்திக்கிறது...',
    sources: 'ஆதாரங்கள்',
    placeholder: 'செய்தியை தட்டச்சு செய்யவும் அல்லது பேச மைக்ரோஃபோனைப் பிடிக்கவும்',
    initialMessage: "**நகர சபை முகவர்:**\nவணக்கம். இது ஃபுகுவோகா நகர AI பொதுத் தகவல் மையம். நகர நிர்வாகம் தொடர்பான கேள்விகளுக்கு என்னால் பதிலளிக்க முடியும்.\n\n**பாட்டி ஃபுக்கு:**\nநான் பாட்டி ஃபுக்கு. நகர AI-க்குத் தெரியாத பழைய நாட்கள் அல்லது உள்ளூர் ஞானத்தைப் பற்றி என்னிடம் எதையும் கேட்கலாம்.\n\n**நகர சபை முகவர்:**\nநாங்கள் இருவரும் இணைந்து உங்கள் கேள்விகளுக்கு உதவுவோம். தயவுசெய்து எதையும் கேட்கலாம்.",
    menu: {
      fontSize: 'எழுத்து அளவு',
      responseLength: 'பதிலின் நீளம்',
      language: 'மொழி',
      sm: 'சிறிய',
      md: 'நடுத்தர',
      lg: 'பெரிய',
      short: 'சுருக்கமாக',
      long: 'நீளமாக',
    }
  },
  hi: { // Hindi
    title: 'फुकुओका सिटी AI गाइड',
    online: 'ऑनलाइन',
    thinking: 'सोच रहा है...',
    sources: 'स्रोत',
    placeholder: 'संदेश टाइप करें या बोलने के लिए माइक दबाए रखें',
    initialMessage: "**नगर पालिका एजेंट:**\nनमस्ते। यह फुकुओका सिटी AI सामान्य जानकारी है। मैं शहर प्रशासन से संबंधित सवालों के जवाब दे सकता हूँ।\n\n**दादी फुकु:**\nमैं दादी फुकु हूँ। मुझसे पुराने दिनों या स्थानीय ज्ञान के बारे में कुछ भी पूछें जो सिटी AI नहीं जानता।\n\n**नगर पालिका एजेंट:**\nहम दोनों मिलकर आपके सवालों में मदद करेंगे। कृपया बेझिझक कुछ भी पूछें।",
    menu: {
      fontSize: 'फ़ॉन्ट आकार',
      responseLength: 'उत्तर की लंबाई',
      language: 'भाषा',
      sm: 'छोटा',
      md: 'मध्यम',
      lg: 'बड़ा',
      short: 'छोटा',
      long: 'लंबा',
    }
  },
  tl: { // Tagalog
    title: 'Gabay ng AI sa Fukuoka',
    online: 'Online',
    thinking: 'Nag-iisip...',
    sources: 'Mga Pinagmulan',
    placeholder: 'Mag-type ng mensahe o pindutin ang mic para magsalita',
    initialMessage: "**Ahente ng City Hall:**\nKamusta. Ito ang Fukuoka City AI General Information. Maaari kong sagutin ang mga tanong tungkol sa administrasyon ng lungsod.\n\n**Lola Fuku:**\nAko si Lola Fuku. Tanungin mo ako ng kahit ano tungkol sa mga lumang araw o lokal na karunungan na hindi alam ng City AI.\n\n**Ahente ng City Hall:**\nMagkasama naming sasagutin ang iyong mga katanungan. Huwag mag-atubiling magtanong.",
    menu: {
      fontSize: 'Laki ng Font',
      responseLength: 'Haba ng Sagot',
      language: 'Wika',
      sm: 'Maliit',
      md: 'Katamtaman',
      lg: 'Malaki',
      short: 'Maikli',
      long: 'Mahaba',
    }
  },
  lo: { // Lao
    title: 'ຄູ່ມື AI ເມືອງຟຸກຸໂອກະ',
    online: 'ອອນລາຍ',
    thinking: 'ກຳລັງຄິດ...',
    sources: 'ແຫຼ່ງຂໍ້ມູນ',
    placeholder: 'ພິມຂໍ້ຄວາມ ຫຼືກົດໄມໂຄຣໂຟນຄ້າງໄວ້ເພື່ອເວົ້າ',
    initialMessage: "**ຕົວແທນຫ້ອງການເມືອງ:**\nສະບາຍດີ. ນີ້ແມ່ນຂໍ້ມູນທົ່ວໄປ AI ຂອງເມືອງຟຸກຸໂອກະ. ຂ້ອຍສາມາດຕອບຄຳຖາມກ່ຽວກັບການບໍລິຫານເມືອງໄດ້.\n\n**ແມ່ເຖົ້າຟຸກຸ:**\nຂ້ອຍແມ່ນແມ່ເຖົ້າຟຸກຸ. ຖາມຂ້ອຍໄດ້ທຸກເລື່ອງກ່ຽວກັບສະໄໝກ່ອນ ຫຼື ພູມປັນຍາທ້ອງຖິ່ນທີ່ AI ຂອງເມືອງບໍ່ຮູ້.\n\n**ຕົວແທນຫ້ອງການເມືອງ:**\nພວກເຮົາທັງສອງຈະຊ່ວຍຕອບຄຳຖາມຂອງທ່ານ. ກະລຸນາຖາມໄດ້ທຸກເລື່ອງ.",
    menu: {
      fontSize: 'ຂະໜາດຕົວໜັງສື',
      responseLength: 'ຄວາມຍາວຄຳຕອບ',
      language: 'ພາສາ',
      sm: 'ນ້ອຍ',
      md: 'ກາງ',
      lg: 'ໃຫຍ່',
      short: 'ສັ້ນ',
      long: 'ຍາວ',
    }
  }
};
