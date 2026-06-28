#include <WiFi.h>
#include "time.h"
#include "DHT.h"
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>

/************ WIFI & FIREBASE ************/
const char* ssid = "Fahim";
const char* password = "fahim2031";

#define API_KEY "AIzaSyCDLATfzkDEJODMMjn5QauxgzPzvHMK9tg"
#define DATABASE_URL "esp32-474e4-default-rtdb.asia-southeast1.firebasedatabase.app"

FirebaseData fbdo;
FirebaseConfig config;
FirebaseAuth auth;

const char* ntpServer = "pool.ntp.org";

/************ PINS ************/
#define DHTPIN1 4
#define DHTPIN2 16
#define DHTPIN3 17
#define DHTPIN4 19
#define DHTTYPE DHT22

#define FLAME1 26
#define FLAME2 25
#define FLAME3 33
#define FLAME4 32

#define LED1 2
#define RELAY_PIN 27
#define SERVO_PIN 13

/************ VARIABLES ************/
DHT dht1(DHTPIN1, DHTTYPE);
DHT dht2(DHTPIN2, DHTTYPE);
DHT dht3(DHTPIN3, DHTTYPE);
DHT dht4(DHTPIN4, DHTTYPE);

Servo pumpServo;
unsigned long lastFirebaseTime = 0;
// --- সারভো সুইং করানোর জন্য ভেরিয়েবল ---
unsigned long lastServoMove = 0;
int servoPos = 0;
int servoDirection = 5; // প্রতি পদক্ষেপে ৫ ডিগ্রি করে সরবে

void setup() {
  Serial.begin(115200);

  // --- পিন সেটআপ ---
  pinMode(FLAME1, INPUT_PULLUP);
  pinMode(FLAME2, INPUT_PULLUP);
  pinMode(FLAME3, INPUT_PULLUP);
  pinMode(FLAME4, INPUT_PULLUP);
  pinMode(LED1, OUTPUT);

  // --- রিলের সেফ স্টার্টআপ (শুরুতেই যেন পাম্প অফ থাকে) ---
  digitalWrite(RELAY_PIN, HIGH); // HIGH মানে রিলে অফ
  pinMode(RELAY_PIN, OUTPUT);

  pumpServo.attach(SERVO_PIN, 500, 2400);
  pumpServo.write(0);

  dht1.begin(); dht2.begin(); dht3.begin(); dht4.begin();

  // --- WiFi কানেক্ট ---
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");

  // --- Firebase কানেক্ট ---
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = ""; auth.user.password = "";
  config.signer.test_mode = true;
  Firebase.begin(&config, &auth);
  
  configTime(6 * 3600, 0, ntpServer);
}

void loop() {
  
  /*******************************************************
   * ১. ফ্লেম সেন্সর থেকে রিডিং নেওয়া
   *******************************************************/
  int f1 = digitalRead(FLAME1);
  int f2 = digitalRead(FLAME2);
  int f3 = digitalRead(FLAME3);
  int f4 = digitalRead(FLAME4);

  /*******************************************************
   * ২. কয়টা সেন্সর আগুন পেলো তা গোনা (LOW = আগুন)
   *******************************************************/
  int flameCount = 0;
  
  if (f1 == LOW) { flameCount++; }
  if (f2 == LOW) { flameCount++; }
  if (f3 == LOW) { flameCount++; }
  if (f4 == LOW) { flameCount++; }

  /*******************************************************
   * ৩. একদম সিম্পল পাম্প কন্ট্রোল কন্ডিশন
   *******************************************************/
  if (flameCount >= 2) { 
    // 🔥 যদি ২টা বা তার বেশি সেন্সর আগুন দেখে -> পাম্প ON
    
    digitalWrite(RELAY_PIN, LOW);   // রিলে ON (পাম্প চালু)
    pumpServo.write(90);            // সারভো ON
    digitalWrite(LED1, HIGH);       // অ্যালার্ম লাইট ON

    // --- পাইপ ডানে-বামে ঘোরানোর লজিক (যা নতুন যুক্ত হলো) ---
    if (millis() - lastServoMove >= 30) { 
      lastServoMove = millis();
      servoPos += servoDirection;
      if (servoPos >= 180 || servoPos <= 0) {
        servoDirection = -servoDirection; // ১৮০ তে গেলে উল্টো ঘুরবে
      }
      pumpServo.write(servoPos);
    }
    
    Serial.println("🔥 FIRE DETECTED! PUMP IS ON!");
  } 
  else {
    // ✅ যদি আগুন না থাকে -> পাম্প OFF
    
    digitalWrite(RELAY_PIN, HIGH);  // রিলে OFF (পাম্প বন্ধ)
    pumpServo.write(0);             // সারভো OFF
    digitalWrite(LED1, LOW);        // অ্যালার্ম লাইট OFF
    
    Serial.println("✅ Safe. Pump is OFF.");
  }


  /*******************************************************
   * ৪. প্রতি ৫ সেকেন্ড পর পর Serial Monitor ও Firebase-এ ডাটা পাঠানো
   *******************************************************/
  if (millis() - lastFirebaseTime >= 5000) {
    lastFirebaseTime = millis();
    time_t now; time(&now);

    // ৪টি DHT সেন্সর থেকেই ডাটা রিড করা
    float t1 = dht1.readTemperature(); float h1 = dht1.readHumidity();
    float t2 = dht2.readTemperature(); float h2 = dht2.readHumidity();
    float t3 = dht3.readTemperature(); float h3 = dht3.readHumidity();
    float t4 = dht4.readTemperature(); float h4 = dht4.readHumidity();

    // ====== [PART A] SERIAL MONITOR-E DATA SHOW KORA ======
    
    // --- DHT Sensors ---
    Serial.println("\n🌡️ ------ DHT SENSOR READINGS ------ 🌡️");
    if(!isnan(t1)) Serial.printf("Sensor 1 -> Temp: %.1f°C | Hum: %.0f%%\n", t1, h1);
    else Serial.println("❌ Sensor 1 Reading Failed!");
    if(!isnan(t2)) Serial.printf("Sensor 2 -> Temp: %.1f°C | Hum: %.0f%%\n", t2, h2);
    else Serial.println("❌ Sensor 2 Reading Failed!");
    if(!isnan(t3)) Serial.printf("Sensor 3 -> Temp: %.1f°C | Hum: %.0f%%\n", t3, h3);
    else Serial.println("❌ Sensor 3 Reading Failed!");
    if(!isnan(t4)) Serial.printf("Sensor 4 -> Temp: %.1f°C | Hum: %.0f%%\n", t4, h4);
    else Serial.println("❌ Sensor 4 Reading Failed!");
    
    // --- Flame Sensors ---
    Serial.println("\n🔥 ------ FLAME SENSOR STATUS ------ 🔥");
    Serial.printf("Flame Sensor 1: %s\n", (f1 == LOW) ? "🔥 FIRE!" : "✅ Safe");
    Serial.printf("Flame Sensor 2: %s\n", (f2 == LOW) ? "🔥 FIRE!" : "✅ Safe");
    Serial.printf("Flame Sensor 3: %s\n", (f3 == LOW) ? "🔥 FIRE!" : "✅ Safe");
    Serial.printf("Flame Sensor 4: %s\n", (f4 == LOW) ? "🔥 FIRE!" : "✅ Safe");
    Serial.printf("Total Active Flame Sensors: %d\n", flameCount);
    Serial.println("-------------------------------------\n");


    // ====== [PART B] FIREBASE-E DATA PATHANO ======
    
    // ফায়ার স্ট্যাটাস ও কয়টি সেন্সর একটিভ তা পাঠানো
    bool isFireActive = (flameCount >= 2);
    Firebase.RTDB.setBool(&fbdo, "/status/fire_active", isFireActive);
    Firebase.RTDB.setInt(&fbdo, "/status/flame_count", flameCount);

    // প্রতিটি ফ্লেম সেন্সরের আলাদা ডাটা পাঠানো (true = আগুন আছে, false = নিরাপদ)
    Firebase.RTDB.setBool(&fbdo, "/status/flame1_active", (f1 == LOW));
    Firebase.RTDB.setBool(&fbdo, "/status/flame2_active", (f2 == LOW));
    Firebase.RTDB.setBool(&fbdo, "/status/flame3_active", (f3 == LOW));
    Firebase.RTDB.setBool(&fbdo, "/status/flame4_active", (f4 == LOW));

    // DHT Sensors Data Send
    if(!isnan(t1)) { FirebaseJson j1; j1.set("temp", t1); j1.set("humidity", h1); j1.set("time", now); Firebase.RTDB.pushJSON(&fbdo, "/logs/dht1", &j1); }
    if(!isnan(t2)) { FirebaseJson j2; j2.set("temp", t2); j2.set("humidity", h2); j2.set("time", now); Firebase.RTDB.pushJSON(&fbdo, "/logs/dht2", &j2); }
    if(!isnan(t3)) { FirebaseJson j3; j3.set("temp", t3); j3.set("humidity", h3); j3.set("time", now); Firebase.RTDB.pushJSON(&fbdo, "/logs/dht3", &j3); }
    if(!isnan(t4)) { FirebaseJson j4; j4.set("temp", t4); j4.set("humidity", h4); j4.set("time", now); Firebase.RTDB.pushJSON(&fbdo, "/logs/dht4", &j4); }
  }

  delay(1000); // লুপের স্পিড কন্ট্রোল
}