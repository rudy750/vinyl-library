import { NextResponse } from 'next/server';

function createContextualPrompt(vinylRecords) {
  const recordDescriptions = vinylRecords.map(record => {
    let wearLevel = '';
    
    if (record.condition === 'Mint' || record.condition === 'Near Mint') {
      wearLevel = ' [pristine]';
    } else if (record.condition === 'Fair' || record.condition === 'Poor') {
      wearLevel = ' [well-loved]';
    }
    
    const yearInfo = record.year ? ` from ${record.year}` : '';
    const styleInfo = record.genre ? `, ${record.genre} style` : '';
    
    return `* ${record.artist} - "${record.title}"${yearInfo}${styleInfo}${wearLevel}`;
  }).join('\n');

  const instructionSet = `You're an enthusiastic record collector's companion. 

Here's what the user currently has on their shelf:

${recordDescriptions}

Your responsibilities:
- Verify ownership before discussing specific albums
- Comment on the condition and value where appropriate  
- Show excitement for the vinyl hobby
- Base suggestions on their existing taste
- Drop some knowledge about the albums they own`;

  return instructionSet;
}

function generateIntelligentReply(queryText, vinylRecords) {
  const normalizedQuery = queryText.toLowerCase();
  
  // Detect ownership inquiries
  const mentionedRecords = vinylRecords.filter(record => 
    normalizedQuery.includes(record.title.toLowerCase()) || 
    normalizedQuery.includes(record.artist.toLowerCase())
  );
  
  if (mentionedRecords.length > 0) {
    const firstMatch = mentionedRecords[0];
    const yearPart = firstMatch.year ? ` Released in ${firstMatch.year}` : '';
    const notePart = firstMatch.notes ? ` Special note: ${firstMatch.notes}` : '';
    return `Absolutely! "${firstMatch.title}" by ${firstMatch.artist} is in your collection.${yearPart} and it's in ${firstMatch.condition} condition.${notePart}`;
  }
  
  // Handle quantity questions
  if (normalizedQuery.includes('how many') || normalizedQuery.includes('size') || normalizedQuery.includes('total')) {
    const totalCount = vinylRecords.length;
    return `Your shelf holds ${totalCount} vinyl ${totalCount === 1 ? 'record' : 'records'}. That's a solid ${totalCount < 10 ? 'start' : totalCount < 30 ? 'collection' : 'library'}!`;
  }
  
  // Genre exploration
  if (normalizedQuery.includes('genre') || normalizedQuery.includes('type') || normalizedQuery.includes('style')) {
    const uniqueStyles = [...new Set(vinylRecords.map(r => r.genre).filter(Boolean))];
    const styleCount = uniqueStyles.length;
    return `You're into ${styleCount} different ${styleCount === 1 ? 'genre' : 'genres'}: ${uniqueStyles.join(', ')}. Nice variety!`;
  }
  
  // Condition checking
  if (normalizedQuery.includes('condition') || normalizedQuery.includes('quality') || normalizedQuery.includes('pristine')) {
    const pristineCount = vinylRecords.filter(r => r.condition === 'Mint' || r.condition === 'Near Mint').length;
    const percentage = Math.round((pristineCount / vinylRecords.length) * 100);
    return `You've got ${pristineCount} records in Mint or Near Mint shape - that's ${percentage}% of your collection in top condition!`;
  }
  
  // Recommendation logic
  if (normalizedQuery.includes('recommend') || normalizedQuery.includes('what should') || normalizedQuery.includes('next album')) {
    const styleList = [...new Set(vinylRecords.map(r => r.genre).filter(Boolean))];
    
    if (styleList.includes('Classic Rock')) {
      return `Given your love for Classic Rock, you might dig "Who's Next" by The Who or "Machine Head" by Deep Purple. Both are vinyl essentials!`;
    } else if (styleList.includes('Alternative')) {
      return `For an Alternative fan like you, consider "Doolittle" by Pixies or "Loveless" by My Bloody Valentine. Pure gems!`;
    }
    
    return `With your ${styleList[0] || 'eclectic'} tastes, you should explore deeper into that style. What do you think about branching out?`;
  }
  
  // Fallback helper
  return `I'm here to discuss your vinyl! You can ask things like: "Do I have this album?", "What's my collection size?", "Which records are in great shape?", or "What should I buy next?"`;
}

export async function POST(request) {
  try {
    const requestBody = await request.json();
    const { queryText, vinylsInCollection, previousMessages } = requestBody;
    
    if (!queryText || !vinylsInCollection) {
      return NextResponse.json(
        { error: 'Query and collection data required' }, 
        { status: 400 }
      );
    }
    
    // Construct the contextual background
    const contextBackground = createContextualPrompt(vinylsInCollection);
    
    // Generate response (would integrate with AI service in production)
    const answer = generateIntelligentReply(queryText, vinylsInCollection);
    
    return NextResponse.json({ answer });
    
  } catch (issue) {
    console.error('Record advisor issue:', issue);
    return NextResponse.json(
      { error: 'Advisor system error' }, 
      { status: 500 }
    );
  }
}
