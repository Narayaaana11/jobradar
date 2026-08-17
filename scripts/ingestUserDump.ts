import { splitBulkChatText } from '../src/services/bulkSplitterAgent';
import { RawQueue } from '../src/models/RawQueue';
import { processQueueItem } from '../src/services/pipelineProcessor';
import { connectDB } from '../src/config/database';

const userDump = `
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
[04/08, 1:49 pm] null: *Fission Labs Freshers Recruitment | HR Intern @ Hyderabad*
*Qualification:* MBA / PGDM
*Batch:* 2026 
*Apply Link:* https://tinyurl.com/2ja3c7ea 
[05/08, 3:51 pm] null: *Deloitte Freshers Recruitment | Associate Analyst @ Bangalore*
*Qualification:* BSc, BA
*Experience:* Freshers / Upto 1 year
*Apply Link:* https://tinyurl.com/4tjw8f3f 
[06/08, 2:13 pm] null: *HCLTech Freshers Recruitment | Process Associate @ Gurgaon*
*Qualification:* Bachelor’s Degree, MBA
*Eligibility:* Bachelor’s Degree in Business Administration (BBA / MBA), BCom, Engineering (B.Tech), IT, or a related field.
*Apply Link:* https://tinyurl.com/4w58bj62
[06/08, 4:44 pm] null: *Emerson Recruitment | Software Engineer Trainee @ Pune*
*Qualification:* BE / BTech / MTech (Computer Science, Information Technology, or a related engineering discipline)
*Batch:* 2025, 2026
*Apply Link:* https://tinyurl.com/yxx3n99w 
[06/08, 5:50 pm] null: *Amazon Recruitment | Investigation Representative (Work From Home) @ Telangana*
*Qualification:* Graduation, Post Graduation
*Apply Link:* https://tinyurl.com/59r57nhm 
[06/08, 6:57 pm] null: *Cognizant Walkin | Voice Process Executive @ Hyderabad*
*Qualification:* Graduation, Post Graduation
*Experience:* Freshers to 4 Years
*Walkin Date:* 7th August 2026
*Walkin Time:* 9.00 AM to 11.00 AM
*More Details:* https://tinyurl.com/3mu6mcrd
[06/08, 7:37 pm] null: *Amazon Walkin | Customer Support @ Hyderabad*
*Qualification:* 12th, Graduation, Post Graduation
*Experience:* Freshers / 0 to 5 years
*Walkin Date:* 7th August 2026
*Walkin Time:* 9.00 AM to 11.30 PM
*More Details:* https://tinyurl.com/yd2zuc7x
[06/08, 8:45 pm] null: *Diebold Nixdorf Walkin | Associate Service Desk Representative @ Hyderabad*
*Qualification:* Graduation
*Experience:* Freshers / 0 to 2 years
*Walkin Date:* 7th August 2026
*Walkin Time:* 11.00 AM to 3.00 PM
*More Details:* https://tinyurl.com/mvzn7z3e
[06/08, 9:21 pm] null: *Tech Mahindra Freshers Walkin | Content Moderator @ Hyderabad*
*Qualification:* Graduation
*Walkin Date:* 7th August 2026
*Walkin Time:* 10.30 AM to 12.30 PM
*More Details:* https://tinyurl.com/kedxra2b
[06/08, 9:28 pm] null: *Cognizant Freshers Walkin | Customer Service Executive (Voice Process) @ Hyderabad*
*Qualification:* Any Graduation
*Walkin Date:* 7th August 2026
*Walkin Time:* 11.00 AM to 1.00 PM
*More Details:* https://tinyurl.com/4pkbwcw3
[06/08, 10:13 pm] null: *Tech Mahindra Walkin | Banking Process (Customer Support) @ Hyderabad*
*Qualification:* Graduation
*Experience:* Freshers / 0 to 3 years
*Walkin Date:* 7th August 2026
*Walkin Time:* 9.30 AM to 1.30 PM
*More Details:* https://tinyurl.com/3jwxndcd
[06/08, 10:26 pm] null: *CGS Walkin | International Voice & Chat Process @ Hyderabad*
*Qualification:* Graduation
*Experience:* 0 to 5 years
*Walkin Date:* 7th August 2026
*Walkin Time:* 11.30 AM to 4.00 PM
*More Details:* https://tinyurl.com/4zwm2p9r
[06/08, 11:00 pm] null: *Sagility Freshers Walkin | Customer Support Executive @ Hyderabad*
*Qualification:* BCom, BSc, BBA, BA, BPharma
*Batch:* 2023 to 2026 Passouts
*Walkin Date:* 7th to 8th August 2026 
*Walkin Time:* 9.00 AM to 2.00 PM
*More Details:* https://tinyurl.com/dpcvujyf
[06/08, 11:09 pm] null: *[24]7ai Walkin | International Voice Process @ Hyderabad*
*Qualification:* Intermediate, Diploma, Graduation
*Experience:* 0 to 4 years
*Walkin Date:* 7th August 2026
*Walkin Time:* 10.30 AM to 1.00 PM
*More Details:* https://tinyurl.com/34bmtpk5
[06/08, 11:42 pm] null: *Hexaware Technologies Walkin | International Voice Process @ Chennai*
*Qualification:* Any Graduation
*Experience:* Freshers / 0 to 3 years
*Walkin Date:* 7th August 2026 
*Walkin Time:* 10.30 AM to 4.00 PM
*More Details:* https://tinyurl.com/3aaz83r3
[07/08, 10:52 am] null: *GlobalLogic Freshers Recruitment | Associate Analyst @ Telangana*
*Qualification:* Any Graduation
*Apply Link:* https://tinyurl.com/36ck7myt
[07/08, 3:36 pm] null: *Siemens Recruitment | Trainee @ Bangalore*
*Qualification:* BCom, BBA
*Apply Link:* https://tinyurl.com/5xbmhav6 
[07/08, 4:55 pm] null: *Amazon Recruitment | SPS Associate (Work From Home) @ Mumbai*
*Qualification:* Graduation, Post Graduation
*Apply Link:* https://tinyurl.com/e2xu3r7m 
[07/08, 9:23 pm] null: *Accenture Recruitment | IT Customer Service New Associate @ Hyderabad*
*Qualification:* Any Graduation
*Experience:* 0 to 1 year
*Apply Link:* https://tinyurl.com/yh87dfx9
[07/08, 10:53 pm] null: *AGS Health Freshers Walkin | Trainee Process Associate (Non Voice) @ Hyderabad*
*Qualification:* Graduation
*Batch:* 2020 to 2026 Passouts
*Walkin Date:* 8th August 2026
*Walkin Time:* 9.30 AM to 3.30 PM
*More Details:* https://tinyurl.com/9etzubmy
[07/08, 11:28 pm] null: *[24]7ai Walkin | International Voice Process @ Hyderabad*
*Qualification:* Intermediate, Diploma, Graduation
*Experience:* 0 to 3 years
*Walkin Date:* 8th August 2026
*Walkin Time:* 10.30 AM to 1.00 PM
*More Details:* https://tinyurl.com/4mb9hz4a
[07/08, 11:32 pm] null: *TransDyne Freshers Walkin | Trainee Medical Scribe @ Hyderabad, Vijayawada*
*Qualification:* Any Graduation / Post Graduation
*Walkin Date:* 8th August 2026
*Walkin Time:* 10.00 AM to 4.30 PM
*More Details:* https://tinyurl.com/dak46ytx
[07/08, 11:37 pm] null: *Tech Mahindra Walkin | Non Voice (Chat) / Voice / Semi Voice Process @ Bangalore*
*Qualification:* 10+2, Graduation
*Experience:* Freshers / 0 to 2 years
*Walkin Date:* 8th August 2026 
*Walkin Time:* 10.00 AM to 2.30 PM
*More Details:* https://tinyurl.com/mveh4fjk
[07/08, 11:47 pm] null: *Conduent Freshers Walkin | International Voice Process @ Bangalore*
*Qualification:* Graduation
*Salary:* Rs. 3,00,000 - 4,00,000/- per annum
*Walkin Date:* 8th August 2026
*Walkin Time:* 9.00 AM to 1.00 PM
*More Detals:* https://tinyurl.com/yta3sxcu
[07/08, 11:50 pm] null: *Sagility Walkin | Customer Support Executive @ Bangalore*
*Qualification:* 10+2, Diploma (10+3), Graduation
*Experience:* 0 to 3 years
*Walkin Date:* 8th, 9th August 2026
*Walkin Time:* 10.00 AM to 3.00 PM
*More Details:* https://tinyurl.com/yt27a7mv
[08/08, 10:29 am] null: *HCLTech Freshers Recruitment | Graduate Engineer Trainee @ PAN India*
*Qualification:* BE / BTech (CSE, IT, EEE, ECE, EIE)
*Batch:* 2026
*Apply Link:* https://tinyurl.com/yr6yp5x7 
[08/08, 12:31 pm] null: *Cognizant Freshers Recruitment | Service Desk @ PAN India*
*Qualification:* Graduation (BSC, BCA, BCom, BA, BBA, BMS, B.Voc,  etc.)
*Batch:* 2025, 2026
*Last Date to Apply:* 15th August 2026
*Apply Link:* https://tinyurl.com/2dwk2fd7 
[08/08, 1:35 pm] null: *Microsoft Freshers Recruitment | Technology Consulting Intern @ Hyderabad*
*Qualification:* Bachelors Degree
*Eligibility:* Currently Pursuing Bachelor's Degree in Computer Science, Engineering, Finance, Business, or related field.
*Apply Link:* https://tinyurl.com/ds6vdy4p 
[08/08, 5:03 pm] null: *Microsoft Freshers Recruitment | Data Science Intern @ PAN India*
*Qualification:* Masters / Doctorate Degree (Data Science, Mathematics, Statistics, Econometrics, Economics, Operations Research, Computer Science, or related field)
*Apply Link:* https://tinyurl.com/3hxabvp5 
[08/08, 5:47 pm] null: *Movate Technologies Recruitment | Trainee @ Hyderabad*
*Qualification:* Any Graduation
*Experience:* 0 to 1 year
*Apply Link:* https://tinyurl.com/a83nz3pm
[08/08, 6:29 pm] null: *Amazon Recruitment | Central Operations Support Executive (Work From Home) @ Karnataka*
*Qualification:* Bachelors / Masters Degree
*Apply Link:* https://tinyurl.com/4zpnz2ua 
[08/08, 7:58 pm] null: *Amazon Recruitment | Associate (Work From Home) @ PAN India*
*Qualification:* Bachelor's / Masters Degree
*Job Location:* PAN India (Virtual - Bangalore, Hyderabad, Andhra Pradesh, Chennai)
*Job Position:* Associate (ML Data Operations, GO-AI Operations)
*Apply Link:* https://tinyurl.com/z33ruaaj 
[08/08, 9:34 pm] null: *Emerson Recruitment | Software Engineer Trainee @ Pune*
*Qualification:* BE / BTech / MTech (Computer Science, Information Technology, or a related engineering discipline)
*Batch:* 2025, 2026
*Apply Link:* https://tinyurl.com/yxx3n99w 
[08/08, 10:11 pm] null: *Amazon Recruitment | Investigation Representative (Work From Home) @ Telangana*
*Qualification:* Graduation, Post Graduation
*Apply Link:* https://tinyurl.com/59r57nhm 
[09/08, 9:39 am] null: *Qualcomm Freshers Recruitment | Software Engineer @ Hyderabad, Bangalore, Chennai, Noida*
*Qualification:* BE, BTech, ME, MTech
*Batch:* 2027
*Apply Link:* https://tinyurl.com/bde86z2n 
[09/08, 10:45 am] null: *Accenture Recruitment | HR Service Delivery New Associate @ Bangalore*
*Qualification:* Any Graduation
*Experience:* 0 to 1 year
*Apply Link:* https://tinyurl.com/2s8xjfe3
[09/08, 12:05 pm] null: *Cognizant Freshers Recruitment | Fraud Analyst @ Hyderabad*
*Qualification:* Graduation
*Apply Link:* https://tinyurl.com/yfa9723v
[09/08, 1:56 pm] null: *Amazon Recruitment | Digital Associate @ Hyderabad*
*Qualification:* Bachelor's Degree
*Experience:* 0 to 2 years
*Apply Link:* https://tinyurl.com/yn5fb36d 
[09/08, 3:37 pm] null: *Genpact Recruitment | Associate Customer Care (Non Voice) @ Hyderabad*
*Qualification:* Graduation, Post Graduation
*Experience:* Freshers / 0 to 2 years
*Apply Link:* https://tinyurl.com/5fvjutbm 
[09/08, 4:59 pm] null: *Amazon Recruitment | Transportation Representative (Work From Home) @ PAN India*
*Qualification:* Bachelors / Masters Degree
*Apply Link:* https://tinyurl.com/2ujp2wey
[10/08, 9:50 am] null: *Amazon Recruitment | SPS Associate (Work From Home) @ Hyderabad*
*Qualification:* Graduation, Post Graduation
*Apply Link:* https://tinyurl.com/26mwmd2c 
[10/08, 11:09 am] null: *TCS Freshers Recruitment | Trainee @ PAN India*
*Qualification:* BSc, BCom, BBA, BBM, BMS. BA, BAF, BBI, BBE, BFM, BHRM, BIBF
*Batch:* 2027
*Registration End Date:* 2nd September 2026
*Apply Link:* https://tinyurl.com/3r469zdp 
[10/08, 12:49 pm] null: *Quest Global Freshers Recruitment | US Recruiter @ Bangalore*
*Qualification:* BE, BTech, BCA, BSc, MBA (HR)
*Batch:* 2025, 2026
*Apply Link:* https://tinyurl.com/4szksx5z 
[10/08, 1:25 pm] null: *Accenture Recruitment | Trust & Safety New Associate @ Hyderabad*
*Qualification:* Any Graduation
*Experience:* 0 to 1 year
*Apply Link:* https://tinyurl.com/3ab6ruhh
[10/08, 2:29 pm] null: *Movate Technologies Freshers Recruitment | HTML / CSS / JavaScript / JSON @ Hyderabad*
*Qualification:* Any Graduation
*Batch:* 2023, 2024, 2025
*Apply Link:* https://tinyurl.com/bpnafvy8 
[10/08, 3:22 pm] null: *Reliance Jio Freshers Recruitment | Graduate Engineer Trainee @ Mumbai*
*Qualification:* BE, BTech
*Apply Link:* https://tinyurl.com/nhb4xvus
[10/08, 3:58 pm] null: *Accenture Recruitment | Customer Contact Comms New Associate @ Hyderabad*
*Qualification:* Any Graduation
*Experience:* 0 to 1 year
*Apply Link:* https://tinyurl.com/48kcek3c
[10/08, 4:30 pm] null: *Harman Recruitment | Software Engineering Intern @ Bangalore*
*Qualification:* BE, BTech, ME, MTech, MCA, MSc
*Apply Link:* https://tinyurl.com/bdcr7bn4 
[10/08, 5:15 pm] null: *NTT DATA Freshers Recruitment | Technical Graduate Trainee @ Noida*
*Qualification:* BE, BTech
*Batch:* 2025
*Apply Link:* https://tinyurl.com/4wwbvkdy 
[10/08, 6:17 pm] null: *Cargill Recruitment | Finance Operations Trainee @ Bangalore*
*Qualification:* Bachelors / Masters Degree (Commerce / Finance related field)
*Batch:* 2025, 2026
*Apply Link:* https://tinyurl.com/4pahp9c7
[10/08, 6:54 pm] null: *Cisco Freshers Recruitment | Software Engineer @ PAN India*
*Qualification:* Bachelors / Masters Degree
*Batch:* 2027
*Apply Link:* https://tinyurl.com/mv6cbv3w 
[10/08, 9:08 pm] null: *Tech Mahindra Walkin | Service Desk (Technical Support) @ Hyderabad*
*Qualification:* Undergraduates, Graduates, Postgraduates
*Experience:* Freshers / 0 to 5 years
*Walkin Date:* 11th to 14th August 2026 
*Walkin Time:* 10.00 AM to 12.30 PM
*More Details:* https://tinyurl.com/5b86495a
[10/08, 9:25 pm] null: *Tech Mahindra Walkin | Customer Support (Voice) @ Hyderabad*
*Qualification:* HSC, Undergraduates, Graduates, Postgraduates
*Experience:* Freshers / Experienced
*Walkin Date:* 11th to 20th August 2026
*Walkin Time:* 10.00 AM to 12.00 PM
*More Details:* https://tinyurl.com/2jk65ayz
[10/08, 9:35 pm] null: *Cognizant Freshers Walkin | Voice Process Executive @ Hyderabad*
*Qualification:* Graduation, Post Graduation
*Walkin Date:* 11th August 2026
*Walkin Time:* 9.00 AM to 11.00 AM
*More Details:* https://tinyurl.com/3dnafysx
[10/08, 9:49 pm] null: *Cogent Data Solutions Freshers Walkin | US IT Recruiter @ Hyderabad*
*Qualification:* Any Graduation
*Walkin Date:* 11th August 2026
*Walkin Time:* 11.00 AM to 4.00 PM
*More Details:* https://tinyurl.com/yfmvvxyt
[10/08, 10:22 pm] null: *Tech Mahindra Walkin | Banking Process (Customer Support) @ Hyderabad*
*Qualification:* Graduation
*Experience:* Freshers / 0 to 2 years
*Walkin Date:* 11th to 14th August 2026
*Walkin Time:* 9.30 AM to 5.30 PM
*More Details:* https://tinyurl.com/3jwxndcd
[10/08, 10:32 pm] null: *[24]7ai Walkin | International Voice Process @ Hyderabad*
*Qualification:* Intermediate, Diploma, Graduation, PG
*Experience:* 0 to 4 years
*Walkin Date:* 11th August 2026
*Walkin Time:* 10.00 AM to 1.00 PM
*More Details:* https://tinyurl.com/49y3zw88
[10/08, 11:05 pm] null: *BigBasket Freshers Walkin | Business Development Executive @ Hyderabad*
*Qualification:* 12th, Graduation
*Experience:* Freshers / 0 to 2 years
*Walkin Date:* 11th to 13th August 2026
*Walkin Time:* 10.00 AM to 2.00 PM
*More Details:* https://tinyurl.com/yc89a6s9
[10/08, 11:21 pm] null: *Data Marshall Freshers Walkin | Junior Analyst @ Hyderabad*
*Qualification:* BBA, MBA
*Walkin Date:* 11th to 21st August 2026 (Monday to Friday)
*Walkin Time:* 10.00 AM to 2.00 PM
*More Details:* https://tinyurl.com/n43243vd
[10/08, 11:46 pm] null: *Alorica Walkin | International Voice Process @ Bangalore*
*Qualification:* 12th, Graduation
*Experience:* 0 to 5 years
*Walkin Date:* 11th August 2026 
*Walkin Time:* 9.30 AM to 2.00 PM
*More Details:* https://tinyurl.com/4jwpek3y
[10/08, 11:50 pm] null: *Amazon Walkin | Customer Support Executive @ Noida*
*Qualification:* 12th, Graduation, Post Graduation
*Experience:* Freshers / 0 to 5 Years
*Walkin Date:* 13th, 14th August 2026
*Walkin Time:* 10.00 AM to 1.00 PM
*More Details:* https://tinyurl.com/bdcsemfp
[11/08, 9:22 am] null: *Amazon Recruitment | SPS Associate (Work From Home) @ Bangalore*
*Qualification:* Graduation, Post Graduation
*Apply Link:* https://tinyurl.com/25v8m2hh 
[11/08, 10:57 am] null: *Genpact Recruitment | Associate (Customer Service) @ Hyderabad*
*Qualification:* Graduation, Post Graduation
*Experience:* Freshers / 0 to 2 years
*Apply Link:* https://tinyurl.com/5fbrvwaw
[11/08, 11:41 am] null: *EY Freshers Recruitment | Associate (Payroll Operate) @ Bangalore*
*Qualification:* MBA
*Apply Link:* https://tinyurl.com/4bk5m3t3 
[11/08, 12:11 pm] null: *Amazon Recruitment | CXQO Associate @ Hyderabad*
*Qualification:* Bachelor's / Masters Degree
*Experience:* 0 to 2 years
*Apply Link:* https://tinyurl.com/356fdd3y 
[11/08, 12:50 pm] null: *IQVIA Recruitment | Intern @ Bangalore*
*Qualification:* Bachelors / Masters Degree
*Apply Link:* https://tinyurl.com/yc2pxjcf 
[11/08, 1:47 pm] null: *Accenture Freshers Recruitment | AI / ML Computational Science Associate @ Bangalore*
*Qualification:* BE, BTech, MCA, MSc (Computer Science)
*Experience:* Freshers / 0 to 1 year
*Apply Link:* https://tinyurl.com/2hy667j3 
[11/08, 2:40 pm] null: *Amazon Recruitment | Quality Associate (LMAQ) @ Hyderabad*
*Qualification:* Bachelor's /Masters Degree
*Apply Link:* https://tinyurl.com/hkph44h6 
[11/08, 3:43 pm] null: *Zycus Freshers Recruitment | Graduate Trainee (AI-Native Java Engineer) @ Bangalore*
*Qualification:* BE / BTech (Computer Science, Information Technology, Electronics, AI/ML, Data Science, or related branches)
*Batch:* 2026
*Apply Link:* https://tinyurl.com/4k4rrbfz 
[11/08, 4:38 pm] null: *Capgemini Freshers Recruitment | Non Voice Process @ Kolkata*
*Qualification:* Any Graduation
*Apply Link:* https://tinyurl.com/66zzp7h9 
[11/08, 5:12 pm] null: *Broadridge Freshers Recruitment | Member Technical @ Hyderabad*
*Qualification:* Bachelors / Masters Degree
*Experience:* Freshers / 0 to 1 year
*Apply Link:* https://tinyurl.com/32sre32y 
[11/08, 6:22 pm] null: *Infosys BPM Freshers Walkin | Service Desk @ Pune*
*Qualification:* Graduation
*Experience:* Freshers (0 to 1 year)
*Walkin Date:* 12th August 2026
*Walkin Time:* 10.00 AM to 1.00 PM
*More Details:* https://tinyurl.com/2mh5af39
[11/08, 7:10 pm] null: *Amazon Walkin | Customer Support @ Pune*
*Qualification:* 12th, Graduation, Post Graduation
*Experience:* Freshers / 0 to 5 years
*Walkin Date:* 12th to 14th August 2026
*Walkin Time:* 10.00 AM to 2.00 PM
*More Details:* https://tinyurl.com/56zjz7nt
[11/08, 7:30 pm] null: *CGS Walkin | International Voice & Chat Process @ Hyderabad*
*Qualification:* Graduation
*Experience:* Freshers / 0 to 4 years
*Walkin Date:* 12th to 14th August 2026
*Walkin Time:* 10.00 AM to 12.30 PM
*More Details:* https://tinyurl.com/4t9jpkxw
[11/08, 7:47 pm] null: *Amazon Walkin | Customer Support @ Hyderabad*
*Qualification:* 12th, Graduation, Post Graduation
*Experience:* Freshers / 0 to 5 years
*Walkin Date:* 13th to 14th August 2026
*Walkin Time:* 9.00 AM to 11.30 PM
*More Details:* https://tinyurl.com/yd2zuc7x
`;

async function main() {
  await connectDB();
  console.log('[IngestUserDump] Database connected.');

  const posts = await splitBulkChatText(userDump);
  console.log(`========================================`);
  console.log(`[IngestUserDump] Split bulk dump into ${posts.length} distinct job posts.`);
  console.log(`========================================`);

  let count = 0;
  for (let i = 0; i < posts.length; i++) {
    const postText = posts[i];
    const item = await RawQueue.create({
      platform: 'whatsapp_manual',
      channelName: 'WhatsApp Freshers Jobs Dump',
      rawMessageId: `wa-user-dump-${Date.now()}-${i + 1}`,
      rawText: postText,
      processed: false,
    });

    console.log(`[Pipeline] (${i + 1}/${posts.length}) Processing item into pipeline...`);
    try {
      await processQueueItem(item);
      count++;
    } catch (err: any) {
      console.error(`[Pipeline] Error processing post ${i + 1}:`, err.message);
    }
  }

  console.log(`========================================`);
  console.log(`✅ SUCCESSFULLY PROCESSED ${count}/${posts.length} JOBS INTO DATABASE!`);
  console.log(`========================================`);
  process.exit(0);
}

main().catch(console.error);
