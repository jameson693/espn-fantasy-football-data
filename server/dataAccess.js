const cheerio = require('cheerio');
const request = require('request');
const { JSDOM } = require('jsdom');
const constants = require('./constants');

module.exports = {

    async getStandings() {
        return {
          standings: await this.getSeasonStandings()
        }
    },

    async getStats() {
        return {
          stats: await this.getSeasonTeamStats()
        }
    },

    getTeam() {
        const teamUrl = 'http://games.espn.com/ffl/clubhouse?leagueId=211640&teamId=1&seasonId=2017';
        const teamOptions = {
            method: 'GET'
        };

        return this._getPlayersFromTable(teamUrl, teamOptions);
    },

    getMembers() {
        const url = `${constants.ESPN.URL.MEMBERS}?leagueId=${constants.ESPN.LEAGUE_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let table = document.getElementsByClassName('tableBody')[0];
                table = '<table>' + table.innerHTML + '</table>';
                const sortedTable = this._sortTable(table);

                resolve(sortedTable);
            }, reject);
        });
    },

    getScoreBoard(week) {
        let url = `${constants.ESPN.URL.SCOREBOARD}?leagueId=${constants.ESPN.LEAGUE_ID}`;
        url = week ? url + `&matchupPeriodId=${week}` : url;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let matchupTables = document.querySelectorAll('.ptsBased.matchup');
                const matchups = [];
debugger;
                matchupTables.forEach(table => {
                    return this._getIndividualMatchup(table, matchups);
                });

                standingsTable = '<table>' + standingsTable.innerHTML + '</table>';
                const sortedTable = this._sortTable(standingsTable);

                resolve(sortedTable);
            }, reject);
        });
    },

    _getIndividualMatchup(matchupTable, matchupsArray) {
        const $ = cheerio.load(matchupTable);
        const table = $('table');
        const trs = $('tr');

        debugger;

        trs.forEach((i, row) => {
            if (i < 2) {
                const matchup = {};
                const nameNode = $(row).find('.owners');
                const scoreNode = $(row).find('.score');
                const owner = $(nameNode).text()
                matchup[owner] = {
                    score: $(scoreNode).text()
                };
                matchupsArray.push(matchup);
            }
        });
    },

    getSeasonStandings() {
        const url = `${constants.ESPN.URL.STANDINGS}?leagueId=${constants.ESPN.LEAGUE_ID}&seasonId=${constants.ESPN.SEASON_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let table = document.querySelectorAll('table.tableBody')[0];
                table.deleteRow(0);
                table = '<table>' + table.innerHTML + '</table>';
                const sortedTable = this._sortTable(table);

                resolve(sortedTable);
            }, reject);
        });
    },

    getSeasonTeamStats() {
        const url = `${constants.ESPN.URL.STANDINGS}?leagueId=${constants.ESPN.LEAGUE_ID}&seasonId=${constants.ESPN.SEASON_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let standingsTable = document.querySelectorAll('table.tableBody')[1];
                standingsTable.deleteRow(0);
                standingsTable = '<table>' + standingsTable.innerHTML + '</table>';
                const sortedTable = this._sortTable(standingsTable);

                sortedTable.map(teamStats => {
                    const teamString = teamStats.TEAM.split('(');
                    const teamName = teamString[0];
                    const owner = teamString[1];
                    teamStats.TEAM = teamName.trim();
                    teamStats.OWNER = owner.replace(')', '').trim();
                });

                resolve(sortedTable);
            }, reject);
        });
    },

    _sortTable(tableHtml) {
        const items = [];
        const columnHeadings = [];
        const $ = cheerio.load(tableHtml);
        const table = $('table');
        const trs = $(table).find('tr');
        const headers = {};

        trs.each(function(i, row) {
            const itemObj = {};

            $(row).find('td').each(function(j, cell) {
                var value = $(cell).text().trim();

                if (value) {
                    if (!i) {
                        headers[j] = value.split(',')[0];
                    } else {
                        itemObj[headers[j]] = value.split(',')[0];
                    }
                }
          });


          i && items.push(itemObj);

        });

        return items;
    },

    _getPlayersFromTable(teamUrl, teamOptions) {
        return new Promise((resolve, reject) => {
            const players = [];

            JSDOM.fromURL(teamUrl, teamOptions).then(pageDom => {
                const html = pageDom.serialize();

                const dom = new JSDOM(html);
                const document = dom.window.document;

                let table = document.querySelector('.playerTableTable');
                table.deleteRow(0);
                table = '<table>' + table.innerHTML + '</table>';

                var jsonResponse = [],
                    alreadySeen = [];

                const $ = cheerio.load(table);
                const theTable = $('table');

                var columnHeadings = [];

                var trs = $(theTable).find('tr');

                const headers = {};

                trs.each(function(i, row) {
                    const playerObject = {};

                    $(row).find('td').each(function(j, cell) {
                        var value = $(cell).text().trim();

                        if (value) {
                            if (!i) {
                                headers[j] = value.split(',')[0];
                            } else {
                                playerObject[headers[j]] = value.split(',')[0];
                            }
                        }
                  });


                  i && players.push(playerObject);

              });

              resolve(players);
          });


        });
  },

    _scrapePlayerInfo(teamUrl, teamOptions) {
        return new Promise((resolve, reject) => {
            const players = [];

            request(teamUrl, (err, res, body) => {
                const $ = cheerio.load(body);
                const nameTokens = $('h3').filter('.team-name');
                var playerRows = $('.pncPlayerRow');
                var active = false;

                playerRows.each((i, row) => {

                   const player = {};

                   const position = $(row).find('.playerSlot')[0];
                   if (position && position.children[0]) {
                       player.position = position.children[0].data;
                   }

                   const nameNode = $(row).find('.playertablePlayerName')[0];
                   player.playerId = nameNode.children[0].attribs.playerId;
                   player.name = nameNode.children[0].children[0].data;

                   const dataNodes = $(row).find('.playertableData');
                   player.positionRank = dataNodes[0].children[0].data;
                   const pointNodes = $(row).find('.playertableStat.appliedPoints');
                   player.points = pointNodes[0].children[0].data;
                   player.average = pointNodes[1].children[0].data;
                   players.push(player);
                });
                resolve(players);

            });


        });

    }
};
