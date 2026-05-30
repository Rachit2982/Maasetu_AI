# 🤰 MaaSetu AI – Early Warning Maternal Emergency System

## 🚀 Overview

MaaSetu AI is a hybrid maternal healthcare support system designed to improve pregnancy safety in rural and underserved communities.

The platform combines:

* 📱 WhatsApp-Based Symptom Triage
* ⌚ Smart Wearable Monitoring Band
* 🏥 Doctor Monitoring Dashboard
* 🗺️ Hospital & Healthcare Network Dashboard

MaaSetu AI helps identify high-risk pregnancy situations early and enables timely intervention through intelligent monitoring, emergency escalation, and healthcare coordination.

⚠️ **This system is not a medical diagnosis tool.**

It acts as an **early-warning, monitoring, and emergency escalation system** that supports healthcare professionals in making informed decisions.

---

# 🎯 Problem Statement

Pregnant women in rural areas often face:

* Limited access to doctors
* Delayed emergency response
* Low awareness of critical symptoms
* Difficulty determining whether symptoms are serious
* Lack of continuous monitoring
* Inability to seek help during unconsciousness or emergencies

Many maternal complications become severe because warning signs are ignored or recognized too late.

Example:

> "Mujhe pregnancy ke 6th month me pain ho raha hai."

A patient may not know whether this is normal discomfort or a potentially dangerous condition requiring immediate medical attention.

---

# 💡 Solution

MaaSetu AI provides a multi-layered healthcare support ecosystem.

## 📱 WhatsApp-Based Triage System

Patients can communicate symptoms through a simple WhatsApp-style interface.

The system:

* Understands symptom reports
* Conducts structured triage
* Detects red-flag symptoms
* Classifies risk levels
* Escalates emergencies when necessary

Example flow:

Patient → "Mujhe pain ho raha hai"

System →

* Kya bleeding ho rahi hai?
* Kya chakkar aa rahe hain?
* Kya saans lene mein dikkat hai?

Risk is then classified as:

* LOW
* MEDIUM
* HIGH

---

## ⌚ Smart Wearable Band

The MaaSetu Band continuously monitors:

### Health Parameters

* Heart Rate
* Body Temperature
* Activity Levels

### Emergency Detection

* Fall Detection
* Inactivity Detection
* Unresponsive User Detection

### Safety Features

* SOS Emergency Button
* Medicine Reminder Buzzer

The wearable band allows emergency detection even when the patient cannot actively use WhatsApp.

---

## 🏥 Doctor Dashboard

Doctors can:

* Monitor registered patients
* View high-risk alerts
* Review symptom history
* Access patient records
* Analyze wearable sensor data
* Track emergency cases

---

## 🗺️ Admin Dashboard

Administrators can:

* Manage hospitals
* Manage healthcare workers
* Monitor alerts
* View healthcare coverage
* Track patient statistics
* Maintain hospital mappings

---

# 🧠 Core Innovation

MaaSetu AI is not a chatbot.

It is an **Early Warning Maternal Emergency System**.

Instead of diagnosing diseases, the platform:

* Detects warning signs
* Flags high-risk situations
* Escalates emergencies
* Supports healthcare professionals

---

# 🏗️ System Architecture

```text
Pregnant Woman
      ↓
WhatsApp Interface
      ↓
Node.js Backend
      ↓
Rule-Based Triage Engine
      ↓
Risk Classification
      ↓
Emergency Decision Engine
      ↓
Doctor Dashboard
      ↓
Healthcare Intervention
```

### Wearable Layer

```text
MaaSetu Band
      ↓
Heart Rate Monitoring
Temperature Monitoring
Motion Monitoring
      ↓
Emergency Detection
      ↓
Backend API
      ↓
Doctor Dashboard
```

---

# 📋 Features

## Patient Features

### WhatsApp Support

* Symptom Reporting
* Guided Triage
* Emergency Support
* Risk Assessment

### Wearable Features

* Heart Rate Monitoring
* Temperature Monitoring
* Fall Detection
* Motion Tracking
* SOS Emergency Trigger
* Medicine Reminder

---

## Doctor Dashboard Features

### Emergency Panel

* High-Risk Alerts
* Live Monitoring

### Patient Records

* Personal Information
* Pregnancy Information
* Medical History
* Triage Responses

### Quick Actions

* Contact Patient
* Contact Family
* Mark Emergency Handled

---

## Admin Dashboard Features

### Hospital Management

* Register Hospitals
* Manage Healthcare Network

### Alert Monitoring

* Active Alerts
* Emergency Logs

### Analytics

* Total Patients
* Active Cases
* High-Risk Cases

---

# 🏥 Patient Registration Module

## Personal Information

* Name
* Age
* Pregnancy Month
* Husband Name
* Husband Contact Number

## Medical Information

* Blood Group
* Weight
* Height
* Diabetes History
* Hypertension History
* Previous Pregnancy History
* Abortion History

## Current Pregnancy Information

* Pregnancy Start Date
* Expected Delivery Date

## Device Information

* MaaSetu Band ID

## Medical Documents

* Ultrasound Reports
* Prescriptions
* Lab Reports
* Medical Records

---

# ⚙️ Risk Assessment Logic

The platform uses explainable rule-based logic.

Examples:

### High Risk Indicators

* Bleeding
* Severe Pain
* Dizziness
* Difficulty Breathing
* Fall Detected
* High Temperature
* Abnormal Heart Rate
* No Response Detected

Result:

🚨 HIGH RISK

---

### Low Risk Indicators

* Mild Symptoms
* No Red Flags

Result:

🟢 LOW RISK

---

# 🚨 Emergency Escalation Workflow

```text
Patient Reports Symptoms
           ↓
Triage Assessment
           ↓
Risk Classification
           ↓
HIGH RISK DETECTED
           ↓
Patient Monitoring
           ↓
No Response / Critical Condition
           ↓
Emergency Escalation
           ↓
Family Notification
           ↓
Doctor Dashboard Alert
           ↓
Healthcare Intervention
```

---

# 🛠️ Technology Stack

## Frontend

* React.js
* Tailwind CSS

## Backend

* Node.js
* Express.js

## Database

* MongoDB

## Communication

* WhatsApp-Based Interface
* SMS Alerts (Planned)
* Voice Calls (Planned)

## Hardware

* ESP32
* MPU6050
* MAX30102
* Temperature Sensor
* SOS Button
* Buzzer

---

# 📂 Project Structure

```text
maasetu-ai/
│
├── frontend/
│   ├── whatsapp-simulator/
│   ├── doctor-dashboard/
│   └── admin-dashboard/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── index.js
│
├── hardware/
│   ├── esp32/
│   ├── sensors/
│   └── firmware/
│
└── README.md
```

---

# 🎯 Government & Social Impact

MaaSetu AI can support:

* ASHA Workers
* ANM Workers
* Primary Health Centers
* Rural Maternal Health Programs
* Digital Health Initiatives

Benefits:

* Early Risk Detection
* Faster Intervention
* Improved Monitoring
* Better Healthcare Coverage
* Reduced Delays in Care

---

# 🔮 Future Scope

* Clinical Validation
* AI-Based Risk Prediction
* Multilingual Support
* Ambulance Integration
* Government Healthcare Integration
* Predictive Maternal Analytics
* Offline Emergency Detection

---

# ⚠️ Disclaimer

MaaSetu AI is an assistive healthcare technology project developed for educational, research, and hackathon purposes.

The platform does not provide medical diagnosis and should not replace professional medical advice.

All final medical decisions must be made by qualified healthcare professionals.

---

# 👨‍💻 Authors

* Rachit Saxena
* Harshit Sharma

---

# ❤️ Tagline

**"Connecting Mothers to Timely Care Before Emergencies Become Tragedies."**
