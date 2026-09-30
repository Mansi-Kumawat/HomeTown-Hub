// ============================================================================
// SEED SCRIPT — fills an EMPTY database with realistic demo data so the app
// never looks empty on first run.
//
//   Run it with:   npx tsx scripts/seed.ts
//
// Creates: 1 admin, 2 moderators, 5 members, 6 categories, 3 approved
// communities (with covers), sample posts (incl. a pinned announcement),
// comments, likes, 3 upcoming events, notifications, one pending abuse
// report and one pending moderator application.
// ============================================================================

import "dotenv/config"; // loads DATABASE_URL etc. from the .env file
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";

const {
  users, categories, communities, communityMembers, posts, postLikes,
  comments, events, eventAttendees, notifications, reports, moderatorApplications,
} = schema;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const PASSWORD = "Passw0rd!";
const daysFromNow = (days: number, hour = 17) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  console.log("🌱  Seeding Hometown Hub…\n");

  // --- 0. Start from a clean slate (delete children before parents) ---------
  console.log("Clearing existing rows…");
  await db.delete(moderatorApplications);
  await db.delete(reports);
  await db.delete(notifications);
  await db.delete(eventAttendees);
  await db.delete(events);
  await db.delete(comments);
  await db.delete(postLikes);
  await db.delete(posts);
  await db.delete(communityMembers);
  await db.delete(communities);
  await db.delete(categories);
  await db.delete(users);

  // --- 1. Users -------------------------------------------------------------
  const hash = await bcrypt.hash(PASSWORD, 10);
  const [admin] = await db.insert(users).values({
    name: "Arun Verma", email: "admin@hometownhub.app", passwordHash: hash, role: "admin",
    bio: "Platform admin. Keeping Hometown Hub safe and friendly.",
    hometown: "Kochi", currentCity: "Kochi",
  }).returning();

  const [meera] = await db.insert(users).values({
    name: "Meera Pillai", email: "meera@example.com", passwordHash: hash, role: "moderator",
    bio: "Tea estate kid now in Bengaluru. Founded the Munnar circle.",
    hometown: "Munnar", currentCity: "Bengaluru",
  }).returning();

  const [arjun] = await db.insert(users).values({
    name: "Arjun Rathi", email: "arjun@example.com", passwordHash: hash, role: "moderator",
    bio: "Heritage walk enthusiast and amateur photographer.",
    hometown: "Kochi", currentCity: "Chennai",
  }).returning();

  const memberSeeds = [
    { name: "Priya Nair", email: "priya@example.com", hometown: "Munnar", currentCity: "Hyderabad", bio: "Software engineer. Misses the mist and cardamom air." },
    { name: "Rahul Menon", email: "rahul@example.com", hometown: "Kochi", currentCity: "Mumbai", bio: "Chef-in-training, professional beach nostalgist." },
    { name: "Sara Joseph", email: "sara@example.com", hometown: "Fort Kochi", currentCity: "Dubai", bio: "Documenting our grandmother's recipes, one Sunday at a time." },
    { name: "Vikram Singh", email: "vikram@example.com", hometown: "Jaisalmer", currentCity: "Delhi", bio: "Desert born, city dwelling. Camel safari guide every winter." },
    { name: "Ananya Das", email: "ananya@example.com", hometown: "Jaisalmer", currentCity: "Pune", bio: "Folk music archiver and proud Jaisalmeri." },
  ];
  const [priya, rahul, sara, vikram, ananya] = await Promise.all(
    memberSeeds.map((m) =>
      db.insert(users).values({ ...m, passwordHash: hash, role: "member" }).returning().then((r) => r[0])
    )
  );
  console.log(`Created 8 users (password for all: ${PASSWORD})`);

  // --- 2. Categories ----------------------------------------------------------
  const categoryNames: [string, string][] = [
    ["Culture & Heritage", "Festivals, history, language, art and local traditions"],
    ["Food & Markets", "Recipes, street food, farmers markets and home cooking"],
    ["Sports & Games", "Local teams, pickup matches and traditional games"],
    ["Jobs & Housing", "Opportunities back home and rooms/roommates for migrants"],
    ["Volunteering", "Cleanup drives, teaching, blood donation and helping hands"],
    ["Education & Study Circles", "Alumni networks, scholarships and exam prep groups"],
  ];
  const insertedCategories = await Promise.all(
    categoryNames.map(([name, description]) =>
      db.insert(categories).values({ name, description }).returning().then((r) => r[0])
    )
  );
  const [culture, food, , , volunteering] = insertedCategories;
  console.log(`Created ${insertedCategories.length} categories`);

  // --- 3. Communities (all pre-approved for the demo) ---------------------------
  const [munnar] = await db.insert(communities).values({
    name: "Munnar Tea Hills Circle", city: "Munnar, Kerala",
    description: "For everyone raised between the tea gardens — whether you still wake up to mist on the hills or watch it from a flat in Bengaluru. News, old photos, festival plans, and help for anyone visiting or moving back.",
    rules: "1. Be kind — everyone here is a neighbour.\n2. Keep it local: Munnar people, places and stories.\n3. No spam, ads or political campaigning.\n4. Verify before you forward.",
    imageUrl: "/images/community-munnar.jpg",
    status: "approved", categoryId: culture.id, createdById: meera.id, memberCount: 0,
  }).returning();

  const [kochi] = await db.insert(communities).values({
    name: "Fort Kochi Heritage Collective", city: "Fort Kochi, Kochi",
    description: "Preserving the stories of Fort Kochi's streets — Chinese fishing nets, spice godowns, biennale art and Sunday harbour walks. Join us to document, celebrate and protect our shared heritage.",
    rules: "1. Respect every community that calls Fort Kochi home.\n2. Credit photographers and sources.\n3. Heritage first, commerce second.",
    imageUrl: "/images/community-kochi.jpg",
    status: "approved", categoryId: culture.id, createdById: admin.id, memberCount: 0,
  }).returning();

  const [jaisalmer] = await db.insert(communities).values({
    name: "Jaisalmer Desert Voices", city: "Jaisalmer, Rajasthan",
    description: "The golden city's living room. Folk music archives, desert conservation projects, school fundraisers and winter reunion planning for Jaisalmeris everywhere.",
    rules: "1. Desert courtesy: no littering posts, no littering words.\n2. Share opportunities generously.\n3. Verify local news before posting.",
    imageUrl: "/images/community-jaisalmer.jpg",
    status: "approved", categoryId: volunteering.id, createdById: admin.id, memberCount: 0,
  }).returning();
  console.log("Created 3 communities");

  // --- 4. Memberships ------------------------------------------------------------
  // Helper: add an approved member with a role.
  const memberships = [
    { communityId: munnar.id, userId: meera.id, status: "approved", communityRole: "creator" },
    { communityId: munnar.id, userId: priya.id, status: "approved", communityRole: "member" },
    { communityId: munnar.id, userId: rahul.id, status: "approved", communityRole: "member" },
    { communityId: munnar.id, userId: admin.id, status: "approved", communityRole: "member" },
    { communityId: kochi.id, userId: admin.id, status: "approved", communityRole: "creator" },
    { communityId: kochi.id, userId: arjun.id, status: "approved", communityRole: "moderator" },
    { communityId: kochi.id, userId: sara.id, status: "approved", communityRole: "member" },
    { communityId: kochi.id, userId: rahul.id, status: "approved", communityRole: "member" },
    { communityId: kochi.id, userId: vikram.id, status: "pending", communityRole: "member" }, // demo: a request for the moderator queue
    { communityId: jaisalmer.id, userId: admin.id, status: "approved", communityRole: "creator" },
    { communityId: jaisalmer.id, userId: vikram.id, status: "approved", communityRole: "member" },
    { communityId: jaisalmer.id, userId: ananya.id, status: "approved", communityRole: "member" },
  ] as const;
  await db.insert(communityMembers).values([...memberships]);

  // Sync the cached memberCount with reality.
  const countFor = (communityId: number) =>
    memberships.filter((m) => m.communityId === communityId && m.status === "approved").length;
  await db.update(communities).set({ memberCount: countFor(munnar.id) }).where(eq(communities.id, munnar.id));
  await db.update(communities).set({ memberCount: countFor(kochi.id) }).where(eq(communities.id, kochi.id));
  await db.update(communities).set({ memberCount: countFor(jaisalmer.id) }).where(eq(communities.id, jaisalmer.id));
  console.log("Added memberships");

  // --- 5. Posts ------------------------------------------------------------------
  const [post1] = await db.insert(posts).values({
    communityId: munnar.id, authorId: meera.id, type: "announcement", isPinned: true,
    content: "🌧️ MONSOON CLEANUP DRIVE — this Sunday, 7 AM at the Blossom Park entrance.\n\nGloves and bags provided. After we finish, Achamma's stall is sponsoring chai and Pazham pori for everyone. Bring a friend from the hills!",
    likeCount: 0, commentCount: 0,
  }).returning();

  const [post2] = await db.insert(posts).values({
    communityId: munnar.id, authorId: priya.id, type: "normal",
    content: "Found my grandfather's 1987 photo of the old Munnar market — look at those bullock carts! Does anyone recognize the shop on the left?",
    imageUrl: "/images/community-munnar.jpg", likeCount: 0, commentCount: 0,
  }).returning();

  const [post3] = await db.insert(posts).values({
    communityId: kochi.id, authorId: arjun.id, type: "normal",
    content: "Sunday heritage walk photo drop — the fishing nets at golden hour never get old. Full album in the comments. 📷",
    imageUrl: "/images/community-kochi.jpg", likeCount: 0, commentCount: 0,
  }).returning();

  const [post4] = await db.insert(posts).values({
    communityId: kochi.id, authorId: sara.id, type: "normal",
    content: "Recipe archive update: we just crossed 50 documented family recipes! Next up — can anyone share the Vypeen fish curry style? My grandmother's version had roasted coconut and I want to compare.",
    likeCount: 0, commentCount: 0,
  }).returning();

  const [post5] = await db.insert(posts).values({
    communityId: jaisalmer.id, authorId: vikram.id, type: "normal",
    content: "Winter is coming, and so are the tourists. Who's in town between Dec 18–26? Planning the annual desert night under the stars — songs, bajra roti, a bonfire at Sam dunes.",
    imageUrl: "/images/community-jaisalmer.jpg", likeCount: 0, commentCount: 0,
  }).returning();

  const [post6] = await db.insert(posts).values({
    communityId: jaisalmer.id, authorId: ananya.id, type: "normal",
    content: "Recorded 12 Manganiyar folk songs with the elders in Khuri village last week. Uploading to the archive this weekend. If you have old cassettes gathering dust — this is your sign to digitize them!",
    likeCount: 0, commentCount: 0,
  }).returning();
  console.log("Created 6 posts");

  // --- 6. Likes + comments (then sync the cached counts) ---------------------------
  const likeSeeds = [
    { postId: post1.id, userId: priya.id }, { postId: post1.id, userId: rahul.id }, { postId: post1.id, userId: admin.id },
    { postId: post2.id, userId: meera.id }, { postId: post2.id, userId: rahul.id },
    { postId: post3.id, userId: sara.id }, { postId: post3.id, userId: admin.id },
    { postId: post5.id, userId: ananya.id },
  ];
  await db.insert(postLikes).values(likeSeeds);

  const commentSeeds = [
    { postId: post1.id, authorId: priya.id, content: "Count me in! Bringing my cousin too." },
    { postId: post1.id, authorId: rahul.id, content: "Flying down on Saturday just for this. See you at the park!" },
    { postId: post2.id, authorId: meera.id, content: "That's Sankar's cycle shop! It's still there, now run by his son." },
    { postId: post3.id, authorId: sara.id, content: "The third photo is now my phone wallpaper. Stunning!" },
    { postId: post5.id, authorId: ananya.id, content: "In town Dec 20! Reserving my spot by the bonfire." },
  ];
  await db.insert(comments).values(commentSeeds);

  // Sync likeCount / commentCount with the rows we just inserted.
  const allPosts = [post1, post2, post3, post4, post5, post6];
  for (const p of allPosts) {
    await db.update(posts).set({
      likeCount: likeSeeds.filter((l) => l.postId === p.id).length,
      commentCount: commentSeeds.filter((c) => c.postId === p.id).length,
    }).where(eq(posts.id, p.id));
  }
  console.log("Added likes & comments");

  // --- 7. Events --------------------------------------------------------------------
  const [event1] = await db.insert(events).values({
    communityId: munnar.id, creatorId: meera.id,
    title: "Monsoon Cleanup Drive", location: "Blossom Park entrance, Munnar",
    eventDate: daysFromNow(4, 7),
    description: "Gloves, bags and chai on us. Wear boots — it will be gloriously muddy.",
    attendeeCount: 0,
  }).returning();

  const [event2] = await db.insert(events).values({
    communityId: kochi.id, creatorId: arjun.id,
    title: "Golden Hour Heritage Walk & Photo Meetup", location: "Vasco da Gama Square, Fort Kochi",
    eventDate: daysFromNow(9, 16),
    description: "A slow 2-hour walk from the fishing nets to the spice market. All cameras welcome — phones too. Best shots get featured in our next heritage calendar.",
    imageUrl: "/images/community-kochi.jpg",
    attendeeCount: 0,
  }).returning();

  const [event3] = await db.insert(events).values({
    communityId: jaisalmer.id, creatorId: vikram.id,
    title: "Sam Dunes Cleanup & Bonfire Night", location: "Sam Sand Dunes entrance",
    eventDate: daysFromNow(16, 15),
    description: "Morning: leave the dunes cleaner than we found them. Evening: folk songs around a bonfire under the stars. Families welcome!",
    imageUrl: "/images/community-jaisalmer.jpg",
    attendeeCount: 0,
  }).returning();

  const attendeeSeeds = [
    { eventId: event1.id, userId: priya.id }, { eventId: event1.id, userId: rahul.id },
    { eventId: event2.id, userId: sara.id }, { eventId: event2.id, userId: rahul.id },
    { eventId: event3.id, userId: ananya.id }, { eventId: event3.id, userId: admin.id },
  ];
  await db.insert(eventAttendees).values(attendeeSeeds);
  for (const e of [event1, event2, event3]) {
    await db.update(events)
      .set({ attendeeCount: attendeeSeeds.filter((a) => a.eventId === e.id).length })
      .where(eq(events.id, e.id));
  }
  console.log("Created 3 events");

  // --- 8. Notifications ---------------------------------------------------------------
  await db.insert(notifications).values([
    { userId: admin.id, type: "community_pending", message: "Welcome, Admin! New communities will appear here for your approval.", link: "/admin?tab=communities" },
    { userId: arjun.id, type: "join_request", message: `${vikram.name} requested to join “${kochi.name}”.`, link: `/communities/${kochi.id}?tab=moderation` },
    { userId: meera.id, type: "moderator_application", message: `${vikram.name} applied to moderate “${munnar.name}”.`, link: `/communities/${munnar.id}?tab=moderation` },
    { userId: priya.id, type: "new_comment", message: `${meera.name} commented on your post: “That's Sankar's cycle shop!…”`, link: `/communities/${munnar.id}` },
    { userId: sara.id, type: "new_event", message: `New event in “${kochi.name}”: Golden Hour Heritage Walk & Photo Meetup`, link: `/communities/${kochi.id}?tab=events` },
  ]);
  console.log("Created notifications");

  // --- 9. One pending abuse report (for the admin queue demo) ----------------------------
  await db.insert(reports).values({
    reporterId: priya.id, postId: post3.id,
    reason: "Testing the report flow — please ignore (demo report).",
    status: "pending",
  });

  // --- 10. One pending moderator application (for the founder demo) ----------------------
  await db.insert(moderatorApplications).values({
    communityId: munnar.id, applicantId: vikram.id,
    reason: "I grew up organizing desert cleanups in my hometown and moderate two city groups already. I'd love to help keep the Munnar circle warm and spam-free while I'm here for the season.",
    status: "pending",
  });

  console.log("\n✅  Seed complete! Log in with:");
  console.log("   Admin     → admin@hometownhub.app");
  console.log("   Moderator → meera@example.com (founded Munnar Tea Hills Circle)");
  console.log("   Moderator → arjun@example.com (moderates Fort Kochi Heritage Collective)");
  console.log("   Member    → priya@example.com");
  console.log(`   Password  → ${PASSWORD} (for all accounts)\n`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
