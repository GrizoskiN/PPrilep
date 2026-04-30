import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🌱 Seeding database…')

  // Seed issues
  const { error: issuesError } = await supabase.from('issues').insert([
    {
      title: 'Large pothole on Partizanska St — blocks traffic daily',
      description: 'Near the intersection with Kuzman Josifovski. Vehicles are forced to swerve into oncoming lane. Dangerous especially at night.',
      district: 'Center',
      category: 'road',
      status: 'open',
    },
    {
      title: 'Water main burst — Varoš lower neighbourhood flooded',
      description: 'Water has been running for 3 days. Basements are flooding. Residents cannot reach the utility company.',
      district: 'Varoš',
      category: 'water',
      status: 'progress',
    },
    {
      title: 'Streetlights out on entire Trizla ridge road',
      description: 'All 12 streetlights on the main road have been dark for 2 weeks. Pedestrians and cyclists at risk after dark.',
      district: 'Trizla',
      category: 'power',
      status: 'open',
    },
    {
      title: 'Overflowing garbage bins in Točila park — rodents spotted',
      description: 'Bins have not been emptied in 10 days. Waste is spilling onto pathways. Children play here.',
      district: 'Točila',
      category: 'garbage',
      status: 'open',
    },
    {
      title: 'Collapsed retaining wall on Rid hillside path',
      description: 'The wall collapsed after heavy rain two weeks ago. Path is partially blocked and unstable. Risk of further collapse.',
      district: 'Rid',
      category: 'road',
      status: 'open',
    },
    {
      title: 'Playground equipment broken at Tri Bari central park',
      description: 'The slide has a cracked support beam and the swing chains are detached. Two children were injured last week.',
      district: 'Tri Bari',
      category: 'park',
      status: 'resolved',
    },
  ])
  if (issuesError) console.error('Issues error:', issuesError.message)
  else console.log('✅ Issues seeded')

  // Seed utility posts
  const { error: utilError } = await supabase.from('utility_posts').insert([
    {
      provider: 'water',
      title: 'Planned maintenance — water shutoff 06:00–14:00 on 3 May',
      body: 'Affects Center and Varoš districts. Please store water in advance. Emergency contact: 02-222-3333.',
      status: 'open',
    },
    {
      provider: 'water',
      title: 'Water quality advisory lifted — Center district',
      body: 'Following the pipe replacement last week, water quality tests confirm all parameters are within safe limits.',
      status: 'resolved',
    },
    {
      provider: 'garbage',
      title: 'Holiday schedule: no collection on 1–2 May',
      body: 'Regular collection resumes 3 May. Please do not leave bins on the street until collection day.',
      status: 'open',
    },
    {
      provider: 'power',
      title: 'Grid upgrade in Trizla — 4-hour outage planned 7 May',
      body: 'Affects households on Klimenta Ohridski, Bratstvo, and Nikola Karev streets. Outage 10:00–14:00.',
      status: 'open',
    },
  ])
  if (utilError) console.error('Utility posts error:', utilError.message)
  else console.log('✅ Utility posts seeded')

  // Seed fund campaigns
  const { error: fundError } = await supabase.from('fund_campaigns').insert([
    {
      title: 'Repave Partizanska pedestrian zone',
      description: 'Raise funds to replace the crumbling cobblestones on the main pedestrian street. City matched funding confirmed.',
      district: 'Center',
      goal_amount: 1200000,
      raised_amount: 340000,
      status: 'active',
    },
    {
      title: 'Solar-powered lights for Trizla ridge path',
      description: 'Install 15 solar street lights on the 2km ridge path used by hundreds of walkers daily.',
      district: 'Trizla',
      goal_amount: 450000,
      raised_amount: 450000,
      status: 'completed',
    },
    {
      title: 'Playground upgrade — Točila park',
      description: 'New equipment, rubber safety surface, and shade structure for the park used by 200+ children.',
      district: 'Točila',
      goal_amount: 300000,
      raised_amount: 87000,
      status: 'active',
    },
  ])
  if (fundError) console.error('Fund campaigns error:', fundError.message)
  else console.log('✅ Fund campaigns seeded')

  // Seed ideas
  const { error: ideasError } = await supabase.from('ideas').insert([
    {
      title: 'Free municipal Wi-Fi in all city parks',
      body: 'Other cities in Macedonia already offer this. It would help students, remote workers, and senior citizens who cannot afford home internet.',
      upvotes: 47,
    },
    {
      title: 'Community garden on the empty lot next to Varoš market',
      body: 'The lot has been abandoned for 8 years. A community garden would reduce waste, provide fresh produce, and bring people together.',
      upvotes: 31,
    },
    {
      title: 'Protected bicycle lane on the main boulevard',
      body: 'Currently cyclists share the road with fast-moving traffic. A dedicated lane would make cycling safe and reduce car use.',
      upvotes: 28,
    },
    {
      title: 'Late-night bus route on weekends',
      body: 'Public transport stops at 22:00. A late-night route on Friday/Saturday would reduce drunk driving and help service workers.',
      upvotes: 19,
    },
  ])
  if (ideasError) console.error('Ideas error:', ideasError.message)
  else console.log('✅ Ideas seeded')

  console.log('🎉 Seed complete')
}

seed().catch(console.error)
