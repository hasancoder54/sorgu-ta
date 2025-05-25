const https = require('https');
const url = require('url');

module.exports = (req, res) => {
  const queryObject = url.parse(req.url,true).query;
  const username = queryObject.username;

  if (!username) {
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'username parametresi gerekli'}));
    return;
  }

  https.get(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`, (resp) => {
    let data = '';

    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      const userData = JSON.parse(data);
      if (!userData || userData.Id === undefined) {
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Kullanıcı bulunamadı'}));
        return;
      }
      const userId = userData.Id;

      https.get(`https://users.roblox.com/v1/users/${userId}`, (resp2) => {
        let data2 = '';
        resp2.on('data', chunk => data2 += chunk);
        resp2.on('end', () => {
          const detailsData = JSON.parse(data2);
          const bannedStatus = detailsData.isBanned ? 'Banlı' : 'Banlı değil';
          const profile_url = `https://www.roblox.com/users/${userId}/profile`;

          https.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`, (resp3) => {
            let data3 = '';
            resp3.on('data', chunk => data3 += chunk);
            resp3.on('end', () => {
              const groupsData = JSON.parse(data3);
              const groups = (groupsData.data || []).map(g => ({
                group_name: g.group.name,
                role_name: g.role.name
              }));
              res.writeHead(200, {'Content-Type': 'application/json'});
              res.end(JSON.stringify({
                id: userId,
                username: detailsData.name,
                display_name: detailsData.displayName,
                banned: bannedStatus,
                profile: profile_url,
                groups: groups
              }));
            });
          }).on('error', (e) => {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Grup verisi alınamadı', details: e.message}));
          });
        });
      }).on('error', (e) => {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Kullanıcı detayları alınamadı', details: e.message}));
      });
    });

  }).on('error', (e) => {
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Kullanıcı ID alınamadı', details: e.message}));
  });
};
