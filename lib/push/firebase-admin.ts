import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getRawServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64",
    ).toString("utf8");
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  }

  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_BASE64 oder FIREBASE_SERVICE_ACCOUNT_JSON ist nicht gesetzt.",
  );
}

function getServiceAccount(): FirebaseServiceAccount {
  const raw = getRawServiceAccount();

  try {
    return JSON.parse(raw) as FirebaseServiceAccount;
  } catch {
    throw new Error("Firebase Service Account ist kein gültiges JSON.");
  }
}

export function getFirebaseMessaging() {
  if (!getApps().length) {
    const serviceAccount = getServiceAccount();

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error(
        "Firebase Service Account enthält nicht alle benötigten Felder.",
      );
    }

    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getMessaging();
}
