import express from "express";
import axios, { all } from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import puppeteer from "puppeteer";
import { HttpsProxyAgent } from "https-proxy-agent";


const app = express();
const PORT = 5000;


const proxy = "https://129-233-158-51.instances.scw.cloud"; // Change to your VPN proxy

const agent = new HttpsProxyAgent(proxy);
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.google.com/",
};
// Enable CORS for frontend requests
app.use(cors());
app.set('trust proxy', true);
// Define the scraping route
app.get("/otv/news/", async (req, res) => {
  try {
    let articles = [];
    for(let i = 1; i <2;i++){
    const URL = `https://odishatv.in/international/${String(i)}`;
    const { data } = await axios.get(URL,{headers});
    const $ = cheerio.load(data);
    

    // Scrape articles inside .listing-style-one
    $(".listing-style-one").each((index, element) => {
      const title = $(element).find("h2").text().trim(); // Extract h2 text
      const link = $(element).find("h2 a").attr("href"); // Extract anchor href
      const date=$(element).find(".featured-cat").text().trim()

      articles.push({
        title,
        link: link ? `https://odishatv.in${link}` : null, // Ensure absolute URL
        date:date
      });
    });
    }
    console.log(articles.length)

    res.json(articles); // Send JSON response
  } catch (error) {
    
    res.status(500).json({ error: "Error scraping data" });
  }
});
app.get("/otv/news/:category",async (req, res) => {
  const category = req.params.category;
  try {
    let articles = [];
    const URL = `https://odishatv.in/${category}/`;
    const { data } = await axios.get(URL,{headers});
    const $ = cheerio.load(data);
    
    

    // Scrape articles inside .listing-style-one
    $(".listing-style-one").each((index, element) => {
      const title = $(element).find("h2").text().trim(); // Extract h2 text
      const link = $(element).find("h2 a").attr("href"); // Extract anchor href
      const date=$(element).find(".featured-cat").text().trim()

      articles.push({
        title,
        link: link ? `${link}` : null, // Ensure absolute URL
        date:date
      });
    });
    //console.log(articles)
    const new_article = [];

    const fetchData = async (article) => {
      try {
        const { data } = await axios.get(article.link, { headers });
        const $ = cheerio.load(data);
        const title = $(".live-main a").text().trim();
        const content=$(".otv-st-content-text p").text()
        const date=$(".otv-auth__date").text().slice(0,11)
        const image=$(".featured-img").attr("src");
        //console.log(image)
   
        new_article.push({ title,content,image,date });
      } catch (error) {
        console.error("Error fetching article:", error);
      }
    };
    
    const scrapeArticles = async () => {
      await Promise.all(articles.map(fetchData));
      console.log(new_article); // Now prints AFTER all async calls complete
      res.json(new_article); // Send JSON response
    };
    
    scrapeArticles();

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Error scraping data" });
  }
});

app.get("/amazon/",async (req,res)=>{
  let articles = [];
  try{
    const scrapeAmazon = async (url) => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
    
      // Set User-Agent to avoid bot detection
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      );
    
      // Go to the product page
      await page.goto(url, { waitUntil: "networkidle2" });
    
      // Extract product details
      const product = await page.evaluate(() => {
        const title = document.querySelector("#productTitle")?.innerText.trim();
        const price = document.querySelector(".a-price span.a-offscreen")?.innerText;
        const rating = document.querySelector(".a-icon-star span")?.innerText;
        const image = document.querySelector("#landingImage")?.src;
        
        return { title, price, rating, image };
      });
      await browser.close();
      return res.json(product);
      console.log(product,"This is product");
    };
    scrapeAmazon("https://www.amazon.in/dp/B0DPS62DYH/ref=sspa_dk_detail_3?pd_rd_i=B0DPS62DYH&pd_rd_w=VMhaZ&content-id=amzn1.sym.9f1cb690-f0b7-44de-b6ff-1bad1e37d3f0&pf_rd_p=9f1cb690-f0b7-44de-b6ff-1bad1e37d3f0&pf_rd_r=C35HB97F8QKRA1PFMGWS&pd_rd_wg=S6hro&pd_rd_r=ea65ceef-dc3d-46e6-98c0-71964e79b6f5&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM&th=1")
    
  }catch(err){
    console.log(err)
    res.json({msg:"error"})
  }
 
})

app.get("/piratebay/top/",(req,res)=>{

  try{
    const allData=[]
    const url=`https://piratebay.baby/search/`
    let update=[]
    const fetchData=async()=>{
      try{
        const {data}=await axios.get(url,{headers,httpAgent:agent})
        const $=cheerio.load(data)
        const allTorrents=[]
        $(".list-entry").each((index, element) => {
          const title = $(element).find(".item-title a").text().trim();
          const size = $(element).find(".item-size").text().trim();
          const magnetUrl = $(element).find(".item-icons a[href^='magnet']").attr("href");
          const UploadBy=$(element).find(".item-user a").text().trim()
          const itemUploaded=$(element).find(".item-uploaded").text().trim()
          const category=$(element).find(".item-type a").text()
          if (title && magnetUrl) {
            allTorrents.push({ title, size, magnetUrl,UploadBy,itemUploaded,category });
          }
        });
        res.json(allTorrents)

      }catch(err){
        console.log(err)
        res.json({msg:"Error"})
        
      }
     
  
      //console.log(size)
      
    }
    fetchData()
  }catch(err){
    console.log(err)
    res.json({msg:"Error"})
  }
})

app.get("/piratebay/search/:searchInput",(req,res)=>{
  const searchInput=req.params.searchInput
  const url=`https://piratebay.baby/search/keywords:${searchInput}/`
  const fetchData=async()=>{
    try{
      const {data}=await axios.get(url,{headers})
      const $=cheerio.load(data)
      const allTorrents=[]
        $(".list-entry").each((index, element) => {
          const title = $(element).find(".item-title a").text().trim();
          const size = $(element).find(".item-size").text().trim();
          const magnetUrl = $(element).find(".item-icons a[href^='magnet']").attr("href");
          const UploadBy=$(element).find(".item-user a").text().trim()
          const itemUploaded=$(element).find(".item-uploaded").text().trim()
          const category=$(element).find(".item-type a").text()
          if (title && magnetUrl) {
            allTorrents.push({ title, size, magnetUrl,UploadBy,itemUploaded,category });
          }
        });
      res.json(allTorrents)
    }catch(err){
      console.log(err)
      res.json({"msg":"Error"})
    }
    
  }
  fetchData()
  
})
app.get("/yts/",(req,res)=>{
 
  const url=`https://yts-official.mx/`
  const fetchData=async()=>{
    try{
      const response=await axios.get(url,{headers})
      
      const $=cheerio.load(response.data)
      console.log("run")
      const allTorrents=[] 
      console.log("start")
      $(".browse-movie-wrap").each((index,element)=>{
        const link=$(element).find("a").attr("href")
        const image=$(element).find("a figure img").attr("src")
        allTorrents.push({link,image})
      })
      return res.json(allTorrents)
    }catch(err){
      console.log(err)
      res.json({msg:"Error"})
    }
  }
  fetchData()
})

app.get("/time-news/",(req,res)=>{
  const data={
        News_Articles:["Home","Us","Politics","World","Health","Climate","Business","Tech","Entertainment","Ideas","Science","History","Sports","Magazine","Time 2030"].map(val=>val.toLowerCase())
          
  }
  res.json(data)
})
app.get('/time-news/:category/:page',(req,res)=>{
  const page=req.params.page
  const category=req.params.category
  console.log(category)
  const fetchData=async ()=>{
    var timesData=[]
    for(let i=1;i<+page;i++){
        const url=`https://time.com/section/${category}/?page=${i}`
        const response=await axios.get(url)
        const $=cheerio.load(response.data)
        $(".taxonomy-tout a").each((index, element) => {
          const link=`https://time.com`+$(element).attr("href")
          let data=$(element).find(".image-container  ")
          data=data.text().trim()
          const match = data.match(/src="([^"]+)"/);
          const image=match[1]
          const headline=$(element).find(".headline").text().trim() || "N/A"
          const dateTime=$(element).find(".byline").text().trim() || "N/A"
          const summary=$(element).find(".summary").text().trim() || "N/A"
        
          timesData.push({link,image,headline,dateTime,summary})    
      });
    }
    
  //console.log(timesData)
  res.json({data:timesData,length:timesData.length})
  return
  }
  fetchData()
  //res.json(timesData)
})

app.get("/time-news/content/:category/:page",(req,res)=>{
  const category=req.params.category
  const page=req.params.page
  const fetchData=async()=>{
    const all_links=[]
    
    const { data } = await axios.get(`http://localhost:5000/time-news/${category}/${page}`); // This gives you the actual data object
    data.data.map((val,index)=>{
        all_links.push(val.link)
    })
    


    const timeData = await Promise.all(
      all_links.map(async (url) => {
        // Fetch each article's page
        const response = await axios.get(url);
        
        const $ = cheerio.load(response.data);
        const image = $("body").find("picture img").attr("url") || "N/A";
        const content = $("body").find("#article-body-main p").text().trim() || "N/A";
        const title = $("body").find("h1").text().trim() || "N/A";
        const dateTime=$("body").find(".block").text().trim().slice(-50) || "N/A"
        return { title, image, content,dateTime,link:url };
      })
    );
    
    console.log(timeData)
    
    return res.json(timeData)


  }
  fetchData()
  return 
    
})






app.get("/track-location", async (req, res) => {
  try {
      const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.log("User IP:", userIp);

      // Use a free geolocation API
      const response = await axios.get(`https://ipapi.co/${userIP}/json/`);

      if (response.data.error) {
          return res.status(400).json({ error: "Could not get location" });
      }

      const { city, region, country_name, latitude, longitude } = response.data;

      res.json({
          ip: userIp,
          city,
          region,
          country: country_name,
          latitude,
          longitude
      });
  } catch (error) {
      res.status(500).json({ error: "Failed to fetch location" });
  }
});
// Start Express server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
