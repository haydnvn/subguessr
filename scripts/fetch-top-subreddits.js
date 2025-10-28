#!/usr/bin/env node

/**
 * Script to fetch top subreddits from Reddit API and filter for image-heavy ones
 * This will replace the manual curation with dynamic fetching
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Subreddits to exclude (NSFW, text-only, etc.)
const EXCLUDED_SUBREDDITS = new Set([
  'askreddit',
  'iama',
  'explainlikeimfive',
  'showerthoughts',
  'lifeprotips',
  'youshouldknow',
  'unpopularopinion',
  'confession',
  'tifu',
  'relationships',
  'relationship_advice',
  'amitheasshole',
  'legaladvice',
  'nostupidquestions',
  'tooafraidtoask',
  'changemyview',
  'casualconversation',
  'self',
  'blog',
  'announcements',
  'help',
  'reddit',
  'modhelp',
  'modnews',
  'changelog',
  'beta',
  'goldbenefits',
  'lounge',
  'centuryclub',
  'eternityclub',
  'popular',
  'all',
  'random',
  'randnsfw',
  'friends',
  'mod',
  'multihub'
]);

// Keywords that indicate image-heavy content
const IMAGE_KEYWORDS = [
  'pic', 'photo', 'image', 'art', 'design', 'porn', 'photography', 'visual',
  'look', 'show', 'made', 'built', 'created', 'draw', 'paint', 'craft',
  'food', 'cook', 'baking', 'meal', 'recipe', 'dish', 'cute', 'aww',
  'animal', 'pet', 'cat', 'dog', 'bird', 'fish', 'nature', 'landscape',
  'earth', 'space', 'sky', 'water', 'city', 'room', 'house', 'home',
  'setup', 'battlestation', 'workspace', 'desk', 'build', 'project',
  'diy', 'handmade', 'craft', 'wood', 'metal', 'ceramic', 'glass',
  'garden', 'plant', 'flower', 'tree', 'succulent', 'bonsai',
  'car', 'bike', 'motorcycle', 'boat', 'plane', 'train', 'vehicle',
  'fashion', 'style', 'outfit', 'makeup', 'hair', 'nail', 'tattoo',
  'watch', 'jewelry', 'accessory', 'collection', 'vintage', 'antique',
  'meme', 'funny', 'humor', 'comic', 'cartoon', 'gif', 'reaction',
  'game', 'gaming', 'play', 'screenshot', 'build', 'mod', 'skin',
  'cool', 'awesome', 'amazing', 'interesting', 'satisfying', 'wtf',
  'weird', 'strange', 'face', 'palm', 'fail', 'win', 'epic', 'insane'
];

async function fetchFromEndpoint(endpoint, pages = 2) {
  let allSubreddits = [];
  let after = null;
  
  for (let page = 0; page < pages; page++) {
    const url = `https://www.reddit.com/subreddits/${endpoint}.json?limit=100${after ? `&after=${after}` : ''}`;
    console.log(`📄 Fetching ${endpoint} page ${page + 1}...`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`⚠️  Failed to fetch ${endpoint} page ${page + 1}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const subreddits = data.data.children;
      
      allSubreddits.push(...subreddits);
      after = data.data.after;
      
      if (!after) break; // No more pages
      
      // Small delay to be respectful to Reddit's API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`⚠️  Error fetching ${endpoint} page ${page + 1}:`, error.message);
      break;
    }
  }
  
  return allSubreddits;
}

async function fetchTopSubreddits() {
  try {
    console.log('🔍 Fetching subreddits from multiple Reddit API endpoints...');
    
    let allSubreddits = [];
    
    // Fetch from different endpoints to get variety
    const endpoints = [
      { name: 'popular', pages: 3 },
      { name: 'new', pages: 2 },
      { name: 'gold', pages: 2 }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n🎯 Fetching from ${endpoint.name} subreddits...`);
      const subreddits = await fetchFromEndpoint(endpoint.name, endpoint.pages);
      allSubreddits.push(...subreddits);
      console.log(`✅ Got ${subreddits.length} subreddits from ${endpoint.name}`);
    }
    
    // Also fetch from specific categories that tend to have medium-sized communities
    const categories = [
      'art', 'books', 'business', 'career', 'cars', 'diy_and_crafts',
      'education', 'entertainment', 'fashion', 'fitness', 'food_and_drink',
      'funny', 'games', 'hobbies', 'home_and_garden', 'music', 'news',
      'photography', 'science', 'sports', 'technology', 'travel'
    ];
    
    console.log(`\n🏷️  Fetching from category-specific subreddits...`);
    for (const category of categories.slice(0, 10)) { // Limit to avoid too many requests
      try {
        const url = `https://www.reddit.com/subreddits/search.json?q=${category}&sort=subscribers&limit=50`;
        console.log(`📂 Fetching ${category} category...`);
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          allSubreddits.push(...data.data.children);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`⚠️  Error fetching ${category}:`, error.message);
      }
    }
    
    // Remove duplicates based on subreddit name
    const uniqueSubreddits = [];
    const seenNames = new Set();
    
    for (const subreddit of allSubreddits) {
      const name = subreddit.data.display_name.toLowerCase();
      if (!seenNames.has(name)) {
        seenNames.add(name);
        uniqueSubreddits.push(subreddit);
      }
    }
    
    console.log(`\n📊 Found ${allSubreddits.length} total subreddits, ${uniqueSubreddits.length} unique`);
    
    // Filter and process subreddits
    const imageSubreddits = [];
    
    for (const subreddit of uniqueSubreddits) {
      const sub = subreddit.data;
      const name = sub.display_name.toLowerCase();
      
      // Skip excluded subreddits
      if (EXCLUDED_SUBREDDITS.has(name)) {
        console.log(`⏭️  Skipping excluded: ${name}`);
        continue;
      }
      
      // Skip NSFW subreddits
      if (sub.over18) {
        console.log(`🔞 Skipping NSFW: ${name}`);
        continue;
      }
      
      // Skip quarantined subreddits
      if (sub.quarantine) {
        console.log(`⚠️  Skipping quarantined: ${name}`);
        continue;
      }
      
      // Check if subreddit likely has image content
      const description = (sub.public_description || sub.description || '').toLowerCase();
      const title = (sub.title || '').toLowerCase();
      const combinedText = `${name} ${title} ${description}`;
      
      const hasImageKeywords = IMAGE_KEYWORDS.some(keyword => 
        combinedText.includes(keyword)
      );
      
      // Include if it has image keywords, is a known image-heavy subreddit, or is likely to have visual content
      const isLikelyImageSub = hasImageKeywords || 
                              isKnownImageSubreddit(name) || 
                              isLikelyVisualContent(name, sub);
      
      if (isLikelyImageSub) {
        imageSubreddits.push({
          name: name,
          subscribers: sub.subscribers || 0,
          title: sub.title || '',
          description: sub.public_description || ''
        });
        console.log(`✅ Added: ${name} (${sub.subscribers?.toLocaleString()} subscribers)`);
      } else {
        console.log(`❌ Filtered out: ${name} (no image indicators)`);
      }
    }
    
    // Add some manually curated medium-sized image-heavy subreddits
    const manualMediumSubs = [
      'battlestations', 'mechanicalkeyboards', 'cozyplaces', 'roomporn', 'designporn',
      'earthporn', 'spaceporn', 'cityporn', 'abandonedporn', 'architectureporn',
      'carporn', 'foodporn', 'animalsbeingderps', 'rarepuppers', 'eyebleach',
      'chonkers', 'absoluteunits', 'startledcats', 'catsstandingup', 'tuckedinkitties',
      'blep', 'supermodelcats', 'illegallysmolcats', 'whatswrongwithyourdog',
      'animalsbeingbros', 'hardcoreaww', 'natureisfuckinglit', 'humansbeingbros',
      'wholesomememes', 'blackmagicfuckery', 'perfecttiming', 'satisfying',
      'oddlysatisfying', 'mildlyinfuriating', 'crappydesign', 'assholedesign',
      'expectationvsreality', 'therewasanattempt', 'facepalm', 'instant_regret',
      'whatcouldgowrong', 'winstupidprizes', 'holdmybeer', 'holdmycosmo',
      'yesyesyesyesno', 'nononono', 'maybemaybemaybe', 'nevertellmetheodds',
      'blackmagicfuckery', 'toptalent', 'beamazed', 'nextfuckinglevel',
      'damnthatsinteresting', 'interestingasfuck', 'mildlyinteresting',
      'coolguides', 'dataisbeautiful', 'mapporn', 'historymemes', 'dankmemes',
      'prequelmemes', 'lotrmemes', 'sequelmemes', 'freefolk', 'gameofthrones',
      'marvelstudios', 'starwars', 'theoffice', 'dundermifflin', 'parksandrec',
      'brooklyn99', 'community', 'friends', 'rickandmorty', 'southpark',
      'simpsons', 'futurama', 'meirl', '2meirl4meirl', 'absolutelynotmeirl',
      'cursedimages', 'blursedimages', 'blessedimages', 'hmmm', 'hmm',
      'thanksihateit', 'tihi', 'makemesuffer', 'oddlyterrifying', 'creepy',
      'softwaregore', 'techsupportgore', 'pareidolia', 'confusing_perspective',
      'perfectfit', 'mildlysatisfying', 'oddlysatisfying', 'satisfying',
      'evilbuildings', 'submechanophobia', 'thalassophobia', 'liminalspace',
      'weirdcore', 'dreamcore', 'vaporwaveaesthetics', 'outrun', 'cyberpunk',
      'steampunk', 'retrofuturism', 'cottagecore', 'darkacademia', 'goblincore',
      'miniworlds', 'wimmelbilder', 'minipainting', 'dioramas', 'modelmakers',
      'lego', 'gunpla', 'miniatures', 'tabletop', 'dnd', 'dndmaps', 'battlemaps',
      'dungeonsanddragons', 'pathfinder_rpg', 'rpg', 'worldbuilding',
      'imaginarymaps', 'imaginarylandscapes', 'imaginarymonsters', 'imaginarycastles',
      'imaginarycityscapes', 'imaginaryarchitecture', 'imaginaryinteriors',
      'imaginaryrooms', 'imaginarysliceoflife', 'imaginaryfeels', 'imaginaryaww',
      'imaginaryhorrors', 'imaginarydemons', 'imaginaryangels', 'imaginaryundead',
      'imaginarywitches', 'imaginaryknights', 'imaginarywarriors', 'imaginaryassassins',
      'imaginaryarchers', 'imaginarywizards', 'imaginaryelemental', 'imaginarydragon',
      'imaginarybeasts', 'imaginarydinosaurs', 'imaginaryrobots', 'imaginarymechs',
      'imaginarystarships', 'imaginaryspaceships', 'imaginaryvehicles', 'imaginaryairships',
      'imaginaryaviation', 'imaginaryautomotive', 'imaginarytrains', 'imaginaryships',
      'imaginarysubmarines', 'imaginarytechnology', 'imaginaryfuturism', 'imaginarycyberpunk',
      'imaginarysteampunk', 'imaginarydieselpunk', 'imaginaryatompunk', 'imaginarybiopunk',
      'imaginarysolarpunk', 'imaginarypostapoc', 'imaginarywasteland', 'imaginaryruins',
      'imaginaryabandonedplaces', 'imaginaryweather', 'imaginarystorms', 'imaginaryskyscapes',
      'imaginarycosmere', 'imaginarywesteros', 'imaginarymiddleearth', 'imaginarynarnia',
      'imaginaryhogwarts', 'imaginarystarwars', 'imaginarytrek', 'imaginarystargate',
      'imaginarywarhammer', 'imaginary40k', 'imaginarywarhammer30k', 'imaginaryaos',
      'imaginarydarksouls', 'imaginarybloodborne', 'imaginaryelden', 'imaginaryzelda',
      'imaginarypokemon', 'imaginarydigimon', 'imaginaryfinalfantasy', 'imaginarydragonage',
      'imaginarymasseffect', 'imaginarybioshock', 'imaginaryfallout', 'imaginaryelderscrolls',
      'imaginarywitcher', 'imaginaryassassinscreed', 'imaginaryhalo', 'imaginarydestiny',
      'imaginaryoverwatch', 'imaginaryleague', 'imaginarydota', 'imaginaryhearthstone',
      'imaginaryminecraft', 'imaginaryterraria', 'imaginarystardew', 'imaginaryanimalcrossing'
    ];
    
    console.log(`\n🎯 Adding ${manualMediumSubs.length} manually curated medium-sized subreddits...`);
    
    // Add manual subs that aren't already in the list
    for (const subName of manualMediumSubs) {
      const exists = imageSubreddits.some(sub => sub.name === subName);
      if (!exists) {
        // Add with estimated subscriber count for medium category
        imageSubreddits.push({
          name: subName,
          subscribers: 50000, // Estimated for medium category
          title: `r/${subName}`,
          description: 'Manually curated image-heavy subreddit'
        });
        console.log(`➕ Added manual: ${subName}`);
      }
    }
    
    // Sort by subscriber count (descending)
    imageSubreddits.sort((a, b) => b.subscribers - a.subscribers);
    
    return imageSubreddits;
    
  } catch (error) {
    console.error('❌ Error fetching subreddits:', error);
    throw error;
  }
}

function isKnownImageSubreddit(name) {
  // List of subreddits we know are image-heavy even if they don't match keywords
  const knownImageSubs = [
    'pics', 'funny', 'aww', 'mildlyinteresting', 'interestingasfuck',
    'nextfuckinglevel', 'damnthatsinteresting', 'oddlysatisfying',
    'mademesmile', 'wholesomememes', 'earthporn', 'foodporn', 'cats',
    'dogs', 'gaming', 'art', 'memes', 'dankmemes', 'me_irl',
    'blackmagicfuckery', 'beamazed', 'toptalent', 'eyebleach',
    'animalsbeingderps', 'photoshopbattles', 'oldschoolcool',
    'itookapicture', 'cozyplaces', 'natureisfuckinglit',
    'humansbeingbros', 'satisfying', 'perfecttiming',
    'mildlyinfuriating', 'crappydesign', 'assholedesign',
    'designporn', 'absoluteunits', 'chonkers', 'rarepuppers',
    'whatswrongwithyourdog', 'startledcats', 'catsstandingup',
    'tuckedinkitties', 'blep', 'hardcoreaww', 'supermodelcats',
    'illegallysmolcats', 'animalsbeingbros', 'weird', 'wtf',
    'facepalm', 'therewasanattempt', 'maplestory', 'trees', 'decks',
    'minecraft', 'overwatch', 'eldenring', 'wow', 'dnd', 'baldursgate3',
    'palworld', 'helldivers', 'pcmasterrace', 'buildapc', 'diy',
    'mapporn', 'classicwow', 'cyberpunkgame', 'oldschoolcool',
    'coolguides', 'dankmemes', 'feedthebeast', 'manga', 'rareinsults',
    'malelivingspace', 'tiktokcringe', 'theydidthemath', 'gamingcirclejerk',
    'globaloffensive', 'games', 'discordapp', 'combatfootage', 'sysadmin',
    'popculturechat', 'whitepeopletwitter', 'technology', 'badroommates',
    'ukrainewarvideoreport', 'peterexplainsthejoke', 'piracy', 'aitah',
    'publicfreakout', 'wallstreetbets', 'news', 'unexpected', 'home'
  ];
  
  return knownImageSubs.includes(name);
}

function isLikelyVisualContent(name, subredditData) {
  // Additional heuristics for visual content
  
  // Gaming subreddits often have screenshots/builds
  const gamingPatterns = [
    /game/, /gaming/, /play/, /wow/, /lol/, /dota/, /cs/, /valorant/,
    /minecraft/, /overwatch/, /elden/, /cyberpunk/, /baldur/, /palworld/,
    /helldivers/, /tarkov/, /ffxiv/, /genshin/, /honkai/, /warframe/,
    /2007scape/, /classicwow/, /feedthebeast/, /steamdeck/
  ];
  
  // Tech/build subreddits often have setup photos
  const techPatterns = [
    /pc/, /build/, /setup/, /battle/, /master/, /tech/, /sysadmin/,
    /discord/, /steam/
  ];
  
  // Creative/lifestyle subreddits
  const creativePatterns = [
    /diy/, /craft/, /art/, /design/, /room/, /living/, /space/,
    /home/, /house/, /decor/, /garden/, /plant/, /cook/, /food/,
    /baking/, /meal/, /recipe/
  ];
  
  // Meme/humor subreddits often have image memes
  const humorPatterns = [
    /meme/, /funny/, /humor/, /joke/, /cringe/, /insult/, /roast/,
    /circle/, /jerk/, /shitpost/, /dank/
  ];
  
  // Check if subreddit name matches any patterns
  const allPatterns = [...gamingPatterns, ...techPatterns, ...creativePatterns, ...humorPatterns];
  const matchesPattern = allPatterns.some(pattern => pattern.test(name));
  
  // Check subscriber count - popular subreddits are more likely to have good content
  const hasGoodSubscriberCount = (subredditData.subscribers || 0) > 50000;
  
  return matchesPattern && hasGoodSubscriberCount;
}

async function generateSubredditsFile() {
  try {
    const projectRoot = path.join(__dirname, '..');
    const outputPath = path.join(projectRoot, 'subreddits.txt');
    
    // Fetch top subreddits
    const subreddits = await fetchTopSubreddits();
    
    // Generate the file content
    let content = `# SubGuessr Subreddit List - Auto-Generated from Reddit API
# Generated on: ${new Date().toISOString()}
# Total subreddits: ${subreddits.length}
# One subreddit per line (without the r/ prefix)
# Lines starting with # are comments and will be ignored

`;

    // Add subreddits grouped by subscriber count
    const mega = subreddits.filter(s => s.subscribers >= 1000000);
    const large = subreddits.filter(s => s.subscribers >= 100000 && s.subscribers < 1000000);
    const medium = subreddits.filter(s => s.subscribers >= 10000 && s.subscribers < 100000);
    const small = subreddits.filter(s => s.subscribers < 10000);

    if (mega.length > 0) {
      content += `# Mega Subreddits (1M+ subscribers)\n`;
      mega.forEach(sub => {
        content += `${sub.name}\n`;
      });
      content += '\n';
    }

    if (large.length > 0) {
      content += `# Large Subreddits (100k-1M subscribers)\n`;
      large.forEach(sub => {
        content += `${sub.name}\n`;
      });
      content += '\n';
    }

    if (medium.length > 0) {
      content += `# Medium Subreddits (10k-100k subscribers)\n`;
      medium.forEach(sub => {
        content += `${sub.name}\n`;
      });
      content += '\n';
    }

    if (small.length > 0) {
      content += `# Small Subreddits (<10k subscribers)\n`;
      small.forEach(sub => {
        content += `${sub.name}\n`;
      });
    }
    
    // Write the file
    fs.writeFileSync(outputPath, content, 'utf-8');
    
    console.log(`\n✅ Generated ${outputPath}`);
    console.log(`📊 Total subreddits: ${subreddits.length}`);
    console.log(`🏆 Mega (1M+): ${mega.length}`);
    console.log(`🥇 Large (100k-1M): ${large.length}`);
    console.log(`🥈 Medium (10k-100k): ${medium.length}`);
    console.log(`🥉 Small (<10k): ${small.length}`);
    
    return subreddits;
    
  } catch (error) {
    console.error('❌ Error generating subreddits file:', error);
    
    // Fallback to existing file if API fails
    console.log('🔄 Falling back to existing subreddits.txt...');
    return null;
  }
}

// Run the script
generateSubredditsFile()
  .then((result) => {
    if (result) {
      console.log('\n🎉 Successfully updated subreddits list from Reddit API!');
    } else {
      console.log('\n⚠️  Using existing subreddits list (API fetch failed)');
    }
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });