import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { userRepository } from "@/lib/db/userRepository";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const user = event.data;
      await userRepository.upsertFromClerk({
        id: user.id,
        email: user.email_addresses.find((e) => e.id === user.primary_email_address_id)
          ?.email_address ?? null,
        firstName: user.first_name,
        lastName: user.last_name,
        imageUrl: user.image_url,
      });
      break;
    }
    case "user.deleted": {
      if (event.data.id) {
        await userRepository.deleteByClerkId(event.data.id);
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
