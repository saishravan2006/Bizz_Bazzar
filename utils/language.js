// Simple language translation utility

// Store user language preferences
const userLanguages = {};

// Available translations
const translations = {
  en: {
    welcome: 'Welcome to *Bizz Bazzar*!',
    category_select: 'Please select a category:',
    product_inquiry: 'What product are you looking for?',
    location_request: 'Please share your location to find nearby sellers.',
    seller_found: 'We found {{count}} sellers for your request!',
    no_seller: 'Sorry, we couldn\'t find any sellers for your request.',
    thank_you: 'Thank you for using our service!'
  },
  hi: {
    welcome: '*Bizz Bazzar* में आपका स्वागत है!',
    category_select: 'कृपया एक श्रेणी चुनें:',
    product_inquiry: 'आप किस उत्पाद की तलाश कर रहे हैं?',
    location_request: 'आस-पास के विक्रेताओं को खोजने के लिए कृपया अपना स्थान साझा करें।',
    seller_found: 'हमें आपके अनुरोध के लिए {{count}} विक्रेता मिले!',
    no_seller: 'क्षमा करें, हम आपके अनुरोध के लिए कोई विक्रेता नहीं ढूंढ सके।',
    thank_you: 'हमारी सेवा का उपयोग करने के लिए धन्यवाद!'
  },
  ta: {
    welcome: '*Bizz Bazzar* வரவேற்கிறோம்!',
    category_select: 'தயவுசெய்து ஒரு வகையைத் தேர்ந்தெடுக்கவும்:',
    product_inquiry: 'நீங்கள் எந்த தயாரிப்பைத் தேடுகிறீர்கள்?',
    location_request: 'அருகிலுள்ள விற்பனையாளர்களைக் கண்டறிய உங்கள் இருப்பிடத்தைப் பகிரவும்.',
    seller_found: 'உங்கள் கோரிக்கைக்கு {{count}} விற்பனையாளர்களைக் கண்டோம்!',
    no_seller: 'மன்னிக்கவும், உங்கள் கோரிக்கைக்கு எந்த விற்பனையாளரையும் எங்களால் கண்டுபிடிக்க முடியவில்லை.',
    thank_you: 'எங்கள் சேவையைப் பயன்படுத்தியதற்கு நன்றி!'
  }
};

// Set user language preference
function setUserLanguage(userId, language) {
  userLanguages[userId] = language;
  return true;
}

// Get user language preference
async function getUserLanguage(userId) {
  return userLanguages[userId] || 'en'; // Default to English
}

// Translate a key for a user
async function translate(userId, key, params = {}) {
  const lang = await getUserLanguage(userId);
  const langData = translations[lang] || translations.en; // Fallback to English
  
  let text = langData[key] || translations.en[key] || key; // Fallback to key if not found
  
  // Replace parameters
  Object.keys(params).forEach(param => {
    text = text.replace(`{{${param}}}`, params[param]);
  });
  
  return text;
}

module.exports = {
  translate,
  setUserLanguage,
  getUserLanguage
};