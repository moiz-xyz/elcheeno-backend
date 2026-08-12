import { PrismaClient, Role, LeadStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ELCHEENO CRM Database Seed...');

  // 1. Seed Admin User
  const adminEmail = 'admin@elcheeno.com';
  const rawPassword = '#Elcheeno123';
  const hashedPassword = bcrypt.hashSync(rawPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: 'Admin ELCHEENO',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Admin User Seeded: ${adminUser.email} (ID: ${adminUser.id})`);

  // 2. Seed Initial Gaming & Security Blog Posts
  const blog1 = await prisma.blogPost.upsert({
    where: { slug: 'safe-fortnite-account-trading-guide-2026' },
    update: {},
    create: {
      title: 'Ultimate Guide to Safe Fortnite Account Trading in 2026',
      slug: 'safe-fortnite-account-trading-guide-2026',
      category: 'Security',
      excerpt: 'Learn the essential security practices, OGO verification steps, and escrow safety protocols before buying or selling Fortnite accounts.',
      content: `
# Ultimate Guide to Safe Fortnite Account Trading in 2026

Trading high-value gaming accounts requires thorough verification and secure escrow protection. 

## Key Security Steps:
1. **Original Email (PDF / OGO Proof)**: Always verify if the seller provides the creation email.
2. **2-Factor Authentication (2FA)**: Ensure all connected console accounts (PSN, Xbox, Switch) are cleanly unlinked.
3. **Escrow Protection**: Never perform direct peer-to-peer bank transfers. Use ELCHEENO automated escrow.

## Red Flags to Avoid:
- Sellers refusing to communicate through official platform chat.
- Unusually low prices for OG Renegade Raider or Travis Scott skins.
- Sellers offering off-platform gift cards.
      `,
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
      tags: ['Fortnite', 'Security', 'Account Trading', 'Escrow'],
      metaTitle: 'Safe Fortnite Account Trading 2026 | ELCHEENO Escrow Guide',
      metaDescription: 'Discover how to securely trade Fortnite accounts with full original email verification and buyer protection.',
      isPublished: true,
      featured: true,
      readTime: '6 min read',
      authorId: adminUser.id,
    },
  });

  const blog2 = await prisma.blogPost.upsert({
    where: { slug: 'how-to-spot-verified-game-boosters' },
    update: {},
    create: {
      title: 'How to Identify Verified & Safe Game Boosters',
      slug: 'how-to-spot-verified-game-boosters',
      category: 'Boosting',
      excerpt: 'Avoid scams and account bans by choosing ID-verified Radiant and Grandmaster boosters with active VPN protection.',
      content: `
# How to Identify Verified & Safe Game Boosters

Rank boosting can elevate your competitive placement, but using unverified services risks permanent hardware bans or compromised credentials.

## What Makes a Booster Safe?
- **VPN Protection**: Matching your local country/IP during duo or pilot sessions.
- **ID & Rank Verification**: Badges proving highest peak rank on main accounts.
- **Offline Mode**: Appearing offline in-game so friends don’t notice boosting activity.
      `,
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop',
      tags: ['Valorant', 'Boosting', 'Rank Up', 'Safety'],
      metaTitle: 'Spot Verified Game Boosters | ELCHEENO Safety',
      metaDescription: 'Learn how ELCHEENO verifies top-tier Radiant and Grandmaster boosters for safe rank progression.',
      isPublished: true,
      featured: false,
      readTime: '4 min read',
      authorId: adminUser.id,
    },
  });

  console.log(`✅ Blog Posts Seeded: "${blog1.title}" and "${blog2.title}"`);

  // 3. Seed Initial CRM Leads from Blogs
  const lead1 = await prisma.blogLead.create({
    data: {
      name: 'Michael Vance',
      email: 'm.vance@example.com',
      subject: 'Inquiry regarding Fortnite OG Account Escrow',
      message: 'Hello ELCHEENO Team, I am interested in selling my 2017 Renegade Raider account. Do you offer VIP seller verification?',
      status: LeadStatus.NEW,
      notes: 'High value potential seller ($1,200+ inventory)',
      blogId: blog1.id,
    },
  });

  console.log(`✅ CRM Blog Lead Seeded: ${lead1.name} (${lead1.email})`);

  console.log('✨ Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
