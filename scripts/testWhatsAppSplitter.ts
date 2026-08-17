import { splitBulkChatText } from '../src/services/bulkSplitterAgent';

const sampleDump = `
[01/08, 12:03 am] null: *Today Walkins (1st August 2026):* 

*Check Here:* https://tinyurl.com/4edvpsx5

*-------------------------------------------------*

Hi.. Members.. Save our website name. 

 *www.freshersjobs24.com*

You can directly visit our website for daily job updates. Share our website site name to all your friends who are searching for jobs.
[01/08, 5:34 pm] null: *Amazon Recruitment | Associate (Quality Services) @ Bangalore*

*Qualification:* Bachelors / Masters Degree

*Apply Link:* https://tinyurl.com/2vy7wcj9 

*Testing Jobs:* https://tinyurl.com/4ajzd8v3
[03/08, 1:52 pm] null: *Sasken Technologies Recruitment | Apprentice Trainee @ Bangalore*

*Qualification:* BCA, BBA, BCom

*Batch:* 2024, 2025, 2026

*Experience:* 0 to 6 months

*Apply Link:* https://tinyurl.com/ycyzekub 
[03/08, 7:00 pm] null: *Sagility Freshers Walkin | Process Consultant @ Hyderabad*

*Qualification:* Intermediate, Graduation

*Experience:* Freshers / Upto 6 months

*Walkin Date:* 4th to 5th August 2026 

*Walkin Time:* 9.30 AM to 2.00 PM

*More Details:* https://tinyurl.com/jmjcbnrs
[03/08, 8:05 pm] null: *Tech Mahindra Walkin | Customer Support (Voice) @ Hyderabad*

*Qualification:* HSC, Undergraduates, Graduates, Postgraduates

*Experience*: Freshers / Experienced

*Walkin Date:* 4th to 20th August 2026

*Walkin Time:* 10.00 AM to 12.00 PM

*More Details:* https://tinyurl.com/2jk65ayz
[03/08, 10:40 pm] null: *Cognizant Freshers Walkin | Voice Process Executive @ Hyderabad*

*Qualification:* Graduation, Post Graduation

*Walkin Date:* 4th August 2026

*Walkin Time:* 9.00 AM to 11.00 AM

*More Details:* https://tinyurl.com/3dnafysx
[03/08, 11:17 pm] null: *[24]7ai Walkin | International Chat Process @ Hyderabad*

*Qualification:* PUC / Intermediate / 10+3 (Diploma) / Graduation

*Experience:* Freshers / 0 to 3 years

*Walkin Date:* 4th August 2026

*Walkin Time:* 10.30 AM to 1.00 PM

*More Details:* https://tinyurl.com/42eytj75
[03/08, 11:25 pm] null: *[24]7ai Walkin | International Voice Process @ Hyderabad*

*Qualification:* Intermediate, Diploma, Graduation, PG

*Experience:* 0 to 4 years

*Walkin Date:* 4th August 2026

*Walkin Time:* 10.30 AM to 1.00 PM

*More Details:* https://tinyurl.com/49y3zw88
`;

async function main() {
  const posts = await splitBulkChatText(sampleDump);
  console.log(`========================================`);
  console.log(`Extracted Job Postings Count: ${posts.length}`);
  console.log(`========================================`);
  posts.forEach((p, idx) => {
    console.log(`\n--- [POST ${idx + 1}] ---`);
    console.log(p);
  });
}

main().catch(console.error);
