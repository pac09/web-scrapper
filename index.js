const fs = require('fs');
const Promise = require('bluebird');
const requestPromise = require('request-promise');
const cheerio = require('cheerio');
const Bottleneck = require("bottleneck");

const limiter = new Bottleneck({
    maxConcurrent: 4
});

const wrappedRequest = limiter.wrap(requestPromise);

function getOptions(url){
    return {
        uri: url,
        headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36'},
        transform: function (body) {
          return cheerio.load(body);
        }
    };
}

//Declaring Main part of the URL, number of pages to scrappe, 
let totalpages = 20;
let prefix = 'https://topdigital.agency';
let metadata = [];
let promises = [];

for (let i = 1; i < totalpages; i++){
    let directoryUrl = prefix + '/agency/?fwp_paged=' + i;

    promises.push(wrappedRequest(getOptions(directoryUrl)).then(($) => {
        let promises = [];

        $('article.media--agency div.media__block div.media__content h2.title a').each(function(index,element) { 
            let agencyUrl = $(this).attr('href');
            
            promises.push(wrappedRequest(getOptions(agencyUrl)).then(function($) {
                let promises = [Promise.resolve()];
                //Name of Json Attributes
                let Name = $('div.hero__content div.hero__header h1.hero__title').text().trim();
                let Website = agencyUrl;
                let AgencyScore = $('body > div.wrap > div > div > main > article > header > div > div > div.col-10.col-md-5.col-lg-4 > div > ul > li:nth-child(1) > div.score.score--sm.score--inv.disabled > div > span').text().trim();
                let logoUrl = $('#content > div > div.block.border-bottom.block-head-profile.js-user-profile-info > div > div > div.box-center > div.avatar > img').attr('src');
                let socialMediaLinks = {
                    socialNetwork : [
                    ]
                };

                // socialMediaLinks.socialNetwork.push({type,count})


                return Promise.all(promises).then(function(){
                    let obj = {
                        Name,
                        Website,
                        AgencyScore,
                        logoUrl,
                        socialMediaLinks
                    };
                    metadata.push(obj);
                    return Promise.resolve();
                });

            }));
        });
        return Promise.all(promises);
    }));
}



Promise.all(promises).then(function () {
    fs.writeFile('results.json', JSON.stringify(metadata, null, 4), function(error) {
        if (!error) {
            console.log('JSON file written.')
        }else{
            console.error('Error writing file' + error);
        }
    });
});