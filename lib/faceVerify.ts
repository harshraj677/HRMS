/**
 * Browser-side face verification using @vladmandic/face-api.
 *
 * Models are loaded from jsDelivr CDN on first call (~6.7 MB total) and
 * cached by the browser automatically. Subsequent calls are fast.
 *
 * This module MUST only be called from browser context (client components).
 * The dynamic import is intentional — it keeps face-api out of the server bundle.
 *
 * Confidence scale:
 *   >= VERIFIED_THRESHOLD  → faceVerified = true   (same person)
 *   >= REVIEW_THRESHOLD    → faceVerified = false, needsReview = true  (borderline)
 *   <  REVIEW_THRESHOLD    → faceVerified = false, needsReview = true  (mismatch)
 *
 *   null faceVerification result → no profile photo, skipped entirely
 */

// Self-hosted — served from /public/models/ with no external CDN dependency
const MODEL_CDN = "/models/";

/** Confidence >= this → verified match (distance ~0.45) */
const VERIFIED_THRESHOLD = 55;
/** Confidence >= this → flag for manual review instead of hard reject */
const REVIEW_THRESHOLD = 25;

export interface FaceVerificationResult {
  confidence: number;    // 0–100
  verified: boolean;
  needsReview: boolean;
  method: string;
  error?: string;
}

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

async function ensureModels(): Promise<typeof import("@vladmandic/face-api")> {
  const faceapi = await import("@vladmandic/face-api");

  if (!modelsLoaded) {
    if (!loadPromise) {
      loadPromise = Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_CDN),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
      ]).then(() => {
        modelsLoaded = true;
      });
    }
    await loadPromise;
  }

  return faceapi;
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

async function getDescriptor(
  faceapi: Awaited<ReturnType<typeof ensureModels>>,
  img: HTMLImageElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

/**
 * Compare a captured selfie against the employee's registered profile photo.
 *
 * @param capturedDataUrl  base64 JPEG from the camera (Phase 1 capture)
 * @param profileDataUrl   base64 data URL from EmployeeProfile.avatar
 * @returns FaceVerificationResult
 */
export async function verifyFace(
  capturedDataUrl: string,
  profileDataUrl: string
): Promise<FaceVerificationResult> {
  const METHOD = "face-api-client-v1";

  try {
    const faceapi = await ensureModels();

    const [capturedImg, profileImg] = await Promise.all([
      dataUrlToImage(capturedDataUrl),
      dataUrlToImage(profileDataUrl),
    ]);

    const [capturedDesc, profileDesc] = await Promise.all([
      getDescriptor(faceapi, capturedImg),
      getDescriptor(faceapi, profileImg),
    ]);

    if (!capturedDesc) {
      return {
        confidence: 0,
        verified: false,
        needsReview: true,
        method: METHOD,
        error: "No face detected in the captured selfie",
      };
    }
    if (!profileDesc) {
      return {
        confidence: 0,
        verified: false,
        needsReview: true,
        method: METHOD,
        error: "No face detected in the profile photo",
      };
    }

    // euclideanDistance: 0 = identical, ~0.45 = threshold, >0.6 = different person
    const distance: number = faceapi.euclideanDistance(
      capturedDesc as unknown as number[],
      profileDesc as unknown as number[]
    );

    // Map distance [0, 1] → confidence [100, 0], clamped to [0, 100]
    const confidence = Math.round(Math.max(0, Math.min(100, (1 - distance) * 100)));
    const verified = confidence >= VERIFIED_THRESHOLD;
    const needsReview = !verified; // any non-verified result goes to review queue

    return { confidence, verified, needsReview, method: METHOD };
  } catch (err) {
    return {
      confidence: 0,
      verified: false,
      needsReview: true,
      method: METHOD,
      error: err instanceof Error ? err.message : "Face verification failed",
    };
  }
}
