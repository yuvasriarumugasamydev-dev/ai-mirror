# ✨ VASTRA AI Smart Mirror - Virtual Saree Try-On Kiosk

A luxury interactive Virtual Saree Boutique Smart Mirror Kiosk built on the **MERN** stack (MongoDB, Express, React, Node.js) with real-time pose tracking, zero-crop geometry preservation, and multi-model neural drape synthesis.

---

## 🌟 Architecture & Features

### 1. Neural Try-On Engines
- **CatVTON (Full-Length Overall)**: Default try-on model for sarees, gowns, and full-length garments. Drapes the entire outfit from shoulders to ankles without cropping into a top.
- **Prompt-Guided AI Drape Edit**: Replaces garments with a neat Nivi drape, pleats, and pallu over the left shoulder while keeping face, skin tone, hair, and background intact.
- **IDM-VTON (Upper-Body)**: Specialized for tops, kurtas, and shirts with cropping disabled (`is_checked_crop: false`).

### 2. Geometry & Aspect Ratio (No Cropping)
- Captured photos are padded (never cropped or zoomed) onto a **3:4 portrait canvas (768×1024)**.
- Preserves the customer's full posture from head to feet.

### 3. MediaPipe Full-Body Pre-Check
- Real-time pose tracking validates all keypoints: head (nose), left & right shoulders, hips, knees, and ankles.
- Dynamic guide silhouette glows **green** when the full body is visible, and **red** when out of alignment.
- The **Capture** button is locked until the full body is aligned.
- Photo pre-validation checks the captured/uploaded image before sending to the AI; if any keypoint is missing, the AI is **not** called, saving quota and prompting the user: *"Please step back so your full body is visible"*.

### 4. Direct Mobile QR Code Transfer (LAN Wi-Fi Direct)
- When a look is captured, the server auto-detects the host PC's local network IPv4 address using `os.networkInterfaces()`.
- Generates a standard ISO/IEC 18004 compliant QR code linking to:
  ```
  http://<LAN_IP>:5050/results/<snapshot_id>
  ```
- Any smartphone connected to the same boutique Wi-Fi can scan the QR code to:
  - View the high-resolution AI virtual try-on look.
  - Download the high-res image directly to the phone gallery.
  - Share the look directly on WhatsApp.
- Result snapshots persist in memory for the duration of the kiosk session (not deleted prematurely).

### 5. Alternative Input: Gallery / Phone Photo Upload
- Click **"Upload Photo"** on the mirror interface to upload a full-length photo from your phone or file system.
- The uploaded photo is fitted to 768×1024 without cropping and passes the same full-body posture check.

---

## 🚀 Running the Project

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017

### Backend Setup
```bash
cd server
npm install
npm run dev
```
The server will start on port `5050` and print the auto-detected LAN IP in the terminal:
```
📱 LAN Mobile QR: http://<LAN_IP>:5050/results/<id>
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```
The Vite frontend will start on `http://localhost:3000`.

---

## 🧪 Testing Guide

### Bug 1: Blank Image & QR Screen Fix
1. Open the mirror at `http://localhost:3000`.
2. Capture a look or upload a photo, then run Virtual Try-On.
3. Observe that the "Look Captured! / Scan to Take This Look Home" screen **only** opens when the AI produces a valid result with status `done`/`completed`.
4. If an image fails to load or the result is missing, an explicit error state is shown with a **Retry** button.
5. In the QR modal, scan the QR code with your smartphone camera (connected to the same Wi-Fi network) or open the printed `http://<LAN_IP>:5050/results/<id>` link in your browser:
   - View the mobile boutique page displaying the saree photo, details, "Save High-Res Photo", and "Share on WhatsApp".

### Bug 2: Full-Body Pose Pre-Check & Photo Upload Fix
1. **Live Outline Check**:
   - Stand close to the camera: the guide outline glows **red** and displays *"Step back to show your full body"*. The **Capture** button is disabled.
   - Step back until head, shoulders, hips, knees, and ankles are in frame: the outline glows **green** and enables the **Capture** button.
2. **Pre-AI Photo Pose Validation**:
   - If a photo without ankles/knees is submitted, the system halts before contacting the AI, shows *"Please step back so your full body is visible"*, and prompts for a retake.
3. **Upload Photo Alternative**:
   - Click the **"Upload Photo"** button in the mirror floating bar.
   - Select a full-body photo from your device.
   - Verify that the image is letterbox-padded to 3:4 (768×1024) without zoom or crop, validated by MediaPipe, and processed by CatVTON.
