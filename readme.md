# 🌐 VoiceTravel – Audio-Based Hotel Booking Website

## 📝 Problem Description
Traditional online hotel booking platforms require users to manually enter multiple details such as destination, dates, guest count, and personal information. This process can be time-consuming, confusing for non-technical users, and inconvenient when multitasking or traveling. There is a clear need for a hands-free, intuitive, and conversational booking experience that reduces user effort and eliminates the complexity of navigating through multiple screens or forms.

---

## 💡 Solution (Through Our Website)
Our platform transforms the hotel-booking experience into a simple, interactive voice conversation.

- Users begin the booking process using **voice commands**.
- The system asks for essential travel details (origin, destination, check-in date, guests, etc.).
- Using speech recognition, the system converts voice input into structured text.
- The platform fetches **real-time hotel suggestions** through a live hotel search API.
- Users can select a hotel and provide their contact information verbally.
- A **secure payment link** is automatically generated and sent to the user via email.
- After the payment is completed, the user receives a confirmation message regarding the booking status.
  
This voice-driven workflow makes the entire process smooth, fast, and user-friendly—ideal for people who prefer hands-free interactions or struggle with complex UIs.

---

## 🛠️ Tech Stack Used

### **Frontend**
- React.js  
- Speech Recognition (react-speech-recognition)

### **Backend**
- Node.js  
- Express.js  

### **Database**
- MySQL  

### **External APIs / Services**
- Travel Advisor Hotel Search API  
- TrueWay Geocoding API  
- WhatsApp Business API (Twilio)  
- Email Service (Nodemailer)  
- Stripe Payment Gateway  

