import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0].emailAddress;

  try {
    // ✅ 1. Check by clerkUserId
    let existingUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    // ✅ 2. If not found → check by email
    if (!existingUser) {
      existingUser = await db.user.findUnique({
        where: {
          email: email,
        },
      });
    }

    // ✅ 3. If found → update clerkUserId
    if (existingUser) {
      return await db.user.update({
        where: { id: existingUser.id },
        data: {
          clerkUserId: user.id,
        },
      });
    }

    // ✅ 4. If not found → create new user
    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        email: email,
        name: `${user.firstName || ""} ${user.lastName || ""}`,
        imageUrl: user.imageUrl,
      },
    });

    return newUser;
  } catch (error) {
    console.error("CHECK USER ERROR:", error);
    return null;
  }
};