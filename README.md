# 🔥 IoT-Based Anomaly Detection and Fire Safety System

An intelligent IoT-based fire safety system that continuously monitors environmental conditions, detects fire hazards in real time, and automatically activates a water suppression mechanism while storing sensor data in Firebase for remote monitoring.

---

## 📖 Overview

Traditional fire alarm systems only notify users after detecting a fire and require manual intervention. This project improves fire safety by combining real-time environmental monitoring, anomaly detection, cloud connectivity, and automatic fire suppression into a single IoT solution.

The system continuously monitors temperature, humidity, and flame status using multiple sensors connected to an ESP32 microcontroller. When fire is detected, the system immediately activates a relay-controlled water pump, stores the event in Firebase Realtime Database, and allows remote monitoring through a web application.

---

## ✨ Features

- 🌡️ Real-time temperature monitoring
- 💧 Real-time humidity monitoring
- 🔥 Instant flame detection
- 🚨 Automatic fire suppression
- 💦 Relay-controlled water pump activation
- ☁️ Firebase Realtime Database integration
- 📊 Live monitoring dashboard
- 📧 Email notification support
- 📈 Cloud data logging
- ⚡ Low-cost IoT implementation

---

## 🛠 Hardware Components

- ESP32 Development Board
- DHT22 Temperature & Humidity Sensors (×4)
- Flame Sensors (×4)
- Relay Module
- Water Pump
- Servo Motor
- Breadboard
- Jumper Wires
- Power Supply
- Water Tank & Pipe

---

## 💻 Software Requirements

- Arduino IDE
- Firebase Realtime Database
- ESP32 Board Package
- Firebase Libraries
- DHT Sensor Library
- Wi-Fi Library
- Web Browser

---

## ⚙️ System Workflow

1. ESP32 initializes all sensors.
2. Temperature and humidity are collected from DHT22 sensors.
3. Flame sensors continuously monitor fire.
4. Sensor data is uploaded to Firebase.
5. System checks for abnormal environmental conditions.
6. If fire is detected:
   - Relay is activated
   - Water pump turns ON
   - Servo directs water spray
   - Firebase updates fire status
   - Notification is generated
7. System resumes monitoring after the fire is extinguished.

---

## 📂 Project Structure

```
├── Arduino_Code/
│   └── FireSafetySystem.ino
│
├── Web_Application/
│   ├── Dashboard
│   ├── Monitoring
│   └── Alerts
│
├── Circuit_Diagram/
│
├── Images/
│
├── Documentation/
│   └── Project Report.pdf
│
└── README.md
```

---

## 🌐 Firebase Database

The system stores:

- Temperature
- Humidity
- Flame Status
- Timestamp
- Fire Events
- Sensor Logs

This enables:

- Real-time monitoring
- Historical data analysis
- Remote access
- Incident tracking

---

## 📸 System Demonstration

The project includes:

- Circuit Diagram
- Hardware Prototype
- Sensor Initialization
- Fire Detection
- Relay Activation
- Water Pump Operation
- Firebase Dashboard
- Web Monitoring Dashboard

---

## 🚀 Future Improvements

- Smoke sensor integration
- Gas leakage detection
- Mobile application
- SMS notifications
- AI-based anomaly prediction
- CCTV integration
- Battery backup system
- MQTT communication
- Multi-floor monitoring
- Automatic emergency service notification

---

## 👨‍💻 Authors

**Md. Khaleduzzaman Fahim**  
Institute of Information Technology  
Jahangirnagar University

**Nusrat Jahan Lopa**  
Institute of Information Technology  
Jahangirnagar University

**Most. Umme Afsana Jahan**  
Institute of Information Technology  
Jahangirnagar University

---

## 👨‍🏫 Supervisor

**Professor Dr. Shamim Al Mamun**

Institute of Information Technology

Jahangirnagar University

---

## 📚 Technologies Used

- ESP32
- Arduino
- Firebase Realtime Database
- IoT
- DHT22 Sensor
- Flame Sensor
- Relay Module
- Water Pump
- Servo Motor
- Wi-Fi

---

## 🎯 Applications

- Smart Classrooms
- Laboratories
- Offices
- Educational Institutions
- Indoor Monitoring
- Small Industries
- Research Laboratories

---

## 📄 Project Report

For complete implementation details, methodology, circuit diagram, results, and discussion, please refer to the project report included in this repository.

---

## ⭐ If you found this project useful, consider giving the repository a star!
