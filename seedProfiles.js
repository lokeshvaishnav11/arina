require('dotenv').config();
const pool=require('./db');

const indianFemaleNames=["Aaradhya","Ananya","Aisha","Priya","Riya","Kiara","Kavya","Isha","Nisha","Pooja","Sneha","Meera","Diya","Sanya","Tanvi","Aditi","Ira","Avni","Myra","Radhika","Shreya","Neha","Simran","Muskan","Sakshi","Palak","Ishita","Nandini","Vaishnavi","Anjali"];
const globalFemaleNames=["Sofia","Emma","Olivia","Ava","Mia","Camila","Yuki","Luna","Isabella","Amelia","Valentina","Nora","Maya","Zara","Elena","Sara","Ana","Julia","Maria","Chloe","Grace","Hana","Lina","Nadia","Leila","Mei","Sakura","Nina","Alina","Carla","Lucia","Eva","Noemi","Iris","Tara","Mila","Layla","Ariana","Bella","Victoria"];
const otherNames=["Noah","Liam","Ethan","Alex","Jordan","Sam","Taylor","Robin","Avery","Kai","Morgan","Casey","Riley","Jamie","Drew","Cameron","Skyler","Quinn","Parker","Reese"];
const indiaCities=["Delhi","Mumbai","Bengaluru","Jaipur","Kolkata","Hyderabad","Pune","Chennai","Ahmedabad","Lucknow","Surat","Indore","Goa","Chandigarh","Kochi","Udaipur","Bhopal","Nagpur","Patna","Guwahati"];
const countryData=[["USA","New York"],["Canada","Toronto"],["Brazil","São Paulo"],["Mexico","Mexico City"],["Argentina","Buenos Aires"],["UK","London"],["France","Paris"],["Germany","Berlin"],["Spain","Madrid"],["Italy","Rome"],["Portugal","Lisbon"],["Netherlands","Amsterdam"],["Sweden","Stockholm"],["Norway","Oslo"],["Poland","Warsaw"],["Turkey","Istanbul"],["Japan","Tokyo"],["South Korea","Seoul"],["Thailand","Bangkok"],["Indonesia","Jakarta"],["Philippines","Manila"],["Singapore","Singapore"],["Malaysia","Kuala Lumpur"],["UAE","Dubai"],["Saudi Arabia","Riyadh"],["South Africa","Cape Town"],["Nigeria","Lagos"],["Kenya","Nairobi"],["Egypt","Cairo"],["Australia","Sydney"],["New Zealand","Auckland"],["Chile","Santiago"],["Colombia","Bogotá"],["Peru","Lima"],["Uruguay","Montevideo"],["Ireland","Dublin"],["Belgium","Brussels"],["Switzerland","Zurich"],["Austria","Vienna"],["Greece","Athens"],["Romania","Bucharest"],["Czech Republic","Prague"],["Hungary","Budapest"],["Ukraine","Kyiv"],["Vietnam","Hanoi"],["China","Shanghai"],["Taiwan","Taipei"],["Hong Kong","Hong Kong"],["Morocco","Casablanca"]];

(async()=>{
  const sql=`INSERT INTO profiles(id,name,age,gender,country,city,img_url,status)
  VALUES(?,?,?,?,?,?,?,?)
  ON DUPLICATE KEY UPDATE name=VALUES(name),age=VALUES(age),gender=VALUES(gender),country=VALUES(country),city=VALUES(city),img_url=VALUES(img_url),status=VALUES(status)`;
  for(let i=0;i<400;i++){
    let gender,country,city,name;
    if(i<120){
      gender='Female';country='India';city=indiaCities[i%indiaCities.length];
      name=indianFemaleNames[i%indianFemaleNames.length]+' '+(i+1);
    }else if(i<380){
      gender='Female';[country,city]=countryData[(i-120)%countryData.length];
      name=globalFemaleNames[(i-120)%globalFemaleNames.length]+' '+(i+1);
    }else{
      const oi=i-380;gender=oi<10?'Male':'Other';[country,city]=countryData[oi%countryData.length];
      name=otherNames[oi%otherNames.length]+' '+(i+1);
    }
    const status=i<380?'online':i<392?'busy':'offline';
    const img=gender==='Female'
      ?`https://randomuser.me/api/portraits/women/${(i%99)+1}.jpg`
      :gender==='Male'
        ?`https://randomuser.me/api/portraits/men/${(i%99)+1}.jpg`
        :'https://randomuser.me/api/portraits/lego/1.jpg';
    await pool.execute(sql,[i+1,name,18+(i%18),gender,country,city,img,status]);
  }
  console.log('400 profiles seeded.');
  await pool.end();
})().catch(async e=>{console.error(e);process.exitCode=1;try{await pool.end()}catch{}});
