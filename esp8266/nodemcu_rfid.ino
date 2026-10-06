/*
 * RFID Attendance Management System - ESP8266 NodeMCU + MFRC522
 * 
 * Hardware Connections:
 * MFRC522       ESP8266 NodeMCU
 * ------------------------------
 * 3.3V          3.3V
 * RST           D3 (GPIO 0)
 * GND           GND
 * MISO          D6 (GPIO 12 / MISO)
 * MOSI          D7 (GPIO 13 / MOSI)
 * SCK           D5 (GPIO 14 / SCK)
 * SDA (SS)      D4 (GPIO 2 / SS)
 * 
 * Optional: Buzzer on D1 (GPIO 5) or Onboard LED on D0 (GPIO 16)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SPI.h>
#include <MFRC522.h>

// Wi-Fi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Server API Endpoint (replace with your computer's local IP address)
const char* SERVER_URL = "http://192.168.1.100:5000/api/rfid/scan";

#define RST_PIN D3
#define SS_PIN  D4
#define BUZZER_PIN D1

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- RFID Attendance NodeMCU Starting ---");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize SPI & MFRC522
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("MFRC522 RFID Reader Initialized.");

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected successfully!");
  Serial.print("NodeMCU IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("Ready to scan RFID cards...\n");
}

void loop() {
  // Check if a new RFID card is present
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Format UID as "80:88:60:2A"
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uidStr += "0";
    }
    uidStr += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) {
      uidStr += ":";
    }
  }
  uidStr.toUpperCase();

  Serial.print("Card Scanned! UID: ");
  Serial.println(uidStr);

  // Send UID to Backend Server
  sendScanToServer(uidStr);

  // Halt PICC to avoid duplicate reads in same touch
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1500); // 1.5s debounce delay
}

void sendScanToServer(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: WiFi Disconnected!");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.print("Sending POST request to: ");
  Serial.println(SERVER_URL);

  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\"uid\":\"" + uid + "\"}";
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Server HTTP Response Code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);

    if (httpResponseCode == 200) {
      // Success feedback beep
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
    } else {
      // Error feedback double beep
      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);
      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);
      digitalWrite(BUZZER_PIN, LOW);
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}
