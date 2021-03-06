var sign = require('./sign.js');

// console.log(sign('jsapi_ticket', 'http://example.com'));
/*
 *something like this
 *{
 *  jsapi_ticket: 'jsapi_ticket',
 *  nonceStr: '82zklqj7ycoywrk',
 *  timestamp: '1415171822',
 *  url: 'http://example.com',
 *  signature: '1316ed92e0827786cfda3ae355f33760c4f70c1f'
 *}
 */
const http = require('http')
const https = require('https')
const fs = require('fs')
var appId = 'wxaf407ff4ec7982cc'
var appSecret = '314a8e1bb7363ff42f99e611a9a66a06'
var access_token_url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
var jsapi_ticket_url =  `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=%ACCESS_TOKEN&type=jsapi`
var web_url = 'http://wx.frp.officialviews.com/' // 后面的斜杠是要的，不然签名出错
var wxSign
var server = http.createServer(async function (req, res) {
    console.log(new Date(), req.url)
    switch (req.url) {
        case '/':
            if (!wxSign) {
                var result = await request({url: access_token_url})
                var access_token = '获取access_token出错'
                try {
                    access_token = JSON.parse(result).access_token
                } catch (e) {}
                result = await request({url: jsapi_ticket_url.replace('%ACCESS_TOKEN', access_token)})
                var jsapi_ticket = '获取jsapi_ticket出错'
                try {
                    jsapi_ticket = JSON.parse(result).ticket
                } catch (e) {}
                wxSign = sign(jsapi_ticket, web_url)
                setTimeout(function(){
                    wxSign = undefined
                }, 7190000)
            }
            req.url = '/index.html'
            //读取文件返回
            var fileName = "./www" + req.url;
            fs.readFile(fileName, function (err, buf) {
                if (err) {
                    res.write(JSON.stringify(err));
                } else {
                    var content = buf.toString()
                    content = content.replace('%signature', wxSign.signature)
                    content = content.replace('%timestamp', wxSign.timestamp)
                    content = content.replace('%nonceStr', wxSign.nonceStr)
                    content = content.replace('%appId', appId)
                    res.write(content)
                }
                res.end()
            })
            break
        default:
            //读取文件返回
            var fileName = "./www" + req.url;
            fs.readFile(fileName, function (err, buf) {
                if (err) {
                    res.write(JSON.stringify(err));
                } else {
                    res.write(buf.toString());
                }
                res.end()
            })
    }
});
server.listen(8080);
console.log('服务地址：' + web_url)

async function request (option = {}) {
    var defaultOption = {
        url: '/',
        success: function () {}
    }
    var result = ''
    option = Object.assign({}, defaultOption, option)
    var $http = /^https\:/.test(option.url) ? https : http
    await new Promise(resolve => {
        $http.get(option.url, function (res) {
            res.setEncoding('utf8')
            res.on('data', function (chunk) {
                result += chunk
            })
            res.on("end", function () {
                option.success(result)
                resolve()
            })
        })
    })
    return result
}