/**
 * TRIPWIRE-PH: Early-Warning Geopolitical Telemetry Monitor
 * Module: DiplomaticIngestion.gs - Task 2.3: Sovereign Diplomatic Feed Parser
 */

// Title Regex: Matches explicit nationwide extreme alert classifications
var NATIONWIDE_TITLE_REGEX = /(Level 4:\s*Do Not Travel|Level 4\s*-\s*Do Not Travel|Do Not Travel|退避勧告|紅色警示)/i;

// Body/Description Regex: Restricts keyword matching strictly to mandatory institutional directives
var INSTITUTIONAL_DIRECTIVES_REGEX = /(ordered departure|authorized departure|evacuation of non-emergency|eligible family members|leave by commercial means immediately|suspension of operations|退避勧告|渡航中止勧告|紅色警示|撤離)/i;

/**
 * Computes SHA-256 hex string from input.
 * @param {string} input
 * @return {string}
 */
function computeSha256(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  var hexStr = '';
  for (var i = 0; i < rawHash.length; i++) {
    var b = rawHash[i];
    if (b < 0) b += 256;
    var byteHex = b.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexStr += byteHex;
  }
  return hexStr;
}

/**
 * Retrieves existing hash IDs from diplomatic_audit tab.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} auditSheet
 * @return {Object.<string, boolean>} Set of known hash IDs
 */
function getExistingDiplomaticHashes(auditSheet) {
  var hashes = {};
  if (!auditSheet) return hashes;

  var lastRow = auditSheet.getLastRow();
  if (lastRow <= 1) return hashes;

  var values = auditSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var h = String(values[i][0]).trim();
    if (h) hashes[h] = true;
  }
  return hashes;
}

/**
 * Queries US State Dept RSS and UK FCDO Atom feeds.
 * Detects sovereign embassy evacuation directives and records new hits to diplomatic_audit tab.
 * @return {{flagged: boolean, items: Array.<{feed: string, title: string, keyword: string, hash: string}>}}
 */
function checkDiplomaticFeeds() {
  var ss = getSpreadsheet();
  var auditSheet = ss.getSheetByName(TRIPWIRE_CONFIG.TABS.DIPLOMATIC_AUDIT);
  var knownHashes = getExistingDiplomaticHashes(auditSheet);
  var flaggedItems = [];
  var rowsToAppend = [];
  var nowIso = getPHTDateTime().isoString;

  // 1. Process US State Department RSS
  try {
    var usResponse = UrlFetchApp.fetch(TRIPWIRE_CONFIG.FEEDS.US_STATE_DEPT_RSS, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'TRIPWIRE-PH/1.0 (Autonomous Geopolitical Early Warning)' }
    });

    if (usResponse.getResponseCode() === 200) {
      var xmlContent = usResponse.getContentText();
      var usItems = parseUsStateDeptXml(xmlContent);

      for (var i = 0; i < usItems.length; i++) {
        var item = usItems[i];
        if (!item) continue;
        var itemTitle = item.title || '';
        var itemDesc = item.description || '';
        var combinedText = (itemTitle + ' ' + itemDesc).toLowerCase();

        if (combinedText.indexOf('philippines') !== -1 || combinedText.indexOf('manila') !== -1 ||
            combinedText.indexOf('taiwan') !== -1 || combinedText.indexOf('taipei') !== -1) {
          
          var matchedKeyword = null;
          // 1. Check title for explicit nationwide Level 4
          var titleMatch = itemTitle.match(NATIONWIDE_TITLE_REGEX);
          if (titleMatch) {
            matchedKeyword = titleMatch[0];
          } else {
            // 2. Check body strictly for institutional evacuation/departure directives
            var bodyMatch = itemDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (bodyMatch) {
              matchedKeyword = bodyMatch[0];
            }
          }

          if (matchedKeyword) {
            var rawKey = 'US_STATE_DEPT|' + item.title + '|' + (item.pubDate || item.link);
            var hashId = computeSha256(rawKey);

            if (!knownHashes[hashId]) {
              knownHashes[hashId] = true;
              flaggedItems.push({
                feed: 'US_STATE_DEPT',
                title: item.title,
                link: item.link || 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/philippines-travel-advisory.html',
                keyword: matchedKeyword,
                hash: hashId
              });
              rowsToAppend.push([hashId, nowIso, 'US_STATE_DEPT', item.title, matchedKeyword]);
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error parsing US State Dept feed: ' + err.toString());
  }

  // 2. Process UK FCDO Atom Feeds (Philippines + Taiwan)
  var ukFeeds = [
    { url: TRIPWIRE_CONFIG.FEEDS.UK_FCDO_ATOM_PH || 'https://www.gov.uk/foreign-travel-advice/philippines.atom', region: 'PH', defaultLink: 'https://www.gov.uk/foreign-travel-advice/philippines' },
    { url: TRIPWIRE_CONFIG.FEEDS.UK_FCDO_ATOM_TW || 'https://www.gov.uk/foreign-travel-advice/taiwan.atom', region: 'TW', defaultLink: 'https://www.gov.uk/foreign-travel-advice/taiwan' }
  ];

  for (var k = 0; k < ukFeeds.length; k++) {
    var feedInfo = ukFeeds[k];
    try {
      var ukResponse = UrlFetchApp.fetch(feedInfo.url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
      });

      if (ukResponse.getResponseCode() === 200) {
        var atomContent = ukResponse.getContentText();
        var ukEntries = parseUkFcdoAtom(atomContent);

        for (var j = 0; j < ukEntries.length; j++) {
          var entry = ukEntries[j];
          if (!entry) continue;
          var entryTitle = entry.title || '';
          var entryBody = (entry.summary || '') + ' ' + (entry.content || '');
          var entryText = (entryTitle + ' ' + entryBody).toLowerCase();

          // Matches Philippines, Manila, Taiwan, or Taipei
          if (entryText.indexOf('philippines') !== -1 || entryText.indexOf('manila') !== -1 ||
              entryText.indexOf('taiwan') !== -1 || entryText.indexOf('taipei') !== -1) {
            
            var matchedKeyword = null;
            var titleMatch = entryTitle.match(NATIONWIDE_TITLE_REGEX);
            if (titleMatch) {
              matchedKeyword = titleMatch[0];
            } else {
              var bodyMatch = entryBody.match(INSTITUTIONAL_DIRECTIVES_REGEX);
              if (bodyMatch) {
                matchedKeyword = bodyMatch[0];
              }
            }

            if (matchedKeyword) {
              var ukRawKey = 'UK_FCDO_' + feedInfo.region + '|' + entry.id + '|' + entry.updated;
              var ukHash = computeSha256(ukRawKey);

              if (!knownHashes[ukHash]) {
                knownHashes[ukHash] = true;
                flaggedItems.push({
                  feed: 'UK_FCDO_' + feedInfo.region,
                  title: entry.title,
                  link: entry.id || feedInfo.defaultLink,
                  keyword: matchedKeyword,
                  hash: ukHash
                });
                rowsToAppend.push([ukHash, nowIso, 'UK_FCDO_' + feedInfo.region, entry.title, matchedKeyword]);
              }
            }
          }
        }
      }
    } catch (err) {
      Logger.log('Error parsing UK FCDO feed (' + feedInfo.region + '): ' + err.toString());
    }
  }

  // 3. Process Japan MOFA Overseas Safety RSS
  try {
    var mofaUrl = TRIPWIRE_CONFIG.FEEDS.JAPAN_MOFA_RSS || 'https://www.anzen.mofa.go.jp/rss/riskinfo.xml';
    var mofaResponse = UrlFetchApp.fetch(mofaUrl, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
    });

    if (mofaResponse.getResponseCode() === 200) {
      var mofaXml = mofaResponse.getContentText();
      var mofaItems = parseUsStateDeptXml(mofaXml);

      for (var m = 0; m < mofaItems.length; m++) {
        var mItem = mofaItems[m];
        if (!mItem) continue;
        var mTitle = mItem.title || '';
        var mDesc = mItem.description || '';
        var mText = (mTitle + ' ' + mDesc).toLowerCase();

        if (mText.indexOf('フィリピン') !== -1 || mText.indexOf('philippines') !== -1 ||
            mText.indexOf('台湾') !== -1 || mText.indexOf('taiwan') !== -1) {
          
          var mMatchedKeyword = null;
          var mTitleMatch = mTitle.match(NATIONWIDE_TITLE_REGEX);
          if (mTitleMatch) {
            mMatchedKeyword = mTitleMatch[0];
          } else {
            var mBodyMatch = mDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (mBodyMatch) {
              mMatchedKeyword = mBodyMatch[0];
            }
          }

          if (mMatchedKeyword) {
            var mRawKey = 'JAPAN_MOFA|' + mItem.title + '|' + (mItem.pubDate || mItem.link);
            var mHash = computeSha256(mRawKey);

            if (!knownHashes[mHash]) {
              knownHashes[mHash] = true;
              flaggedItems.push({
                feed: 'JAPAN_MOFA',
                title: mItem.title,
                link: mItem.link || 'https://www.anzen.mofa.go.jp/',
                keyword: mMatchedKeyword,
                hash: mHash
              });
              rowsToAppend.push([mHash, nowIso, 'JAPAN_MOFA', mItem.title, mMatchedKeyword]);
            }
          }
        }
      }
    }
  } catch (errMofa) {
    Logger.log('Error parsing Japan MOFA feed: ' + errMofa.toString());
  }

  // 4. Process Taiwan BOCA Consular Advisory RSS
  try {
    var bocaUrl = TRIPWIRE_CONFIG.FEEDS.TAIWAN_BOCA_RSS || 'https://www.boca.gov.tw/sp-trwa-rss-1.html';
    var bocaResponse = UrlFetchApp.fetch(bocaUrl, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRIPWIRE-PH/1.0' }
    });

    if (bocaResponse.getResponseCode() === 200) {
      var bocaXml = bocaResponse.getContentText();
      var bocaItems = parseUsStateDeptXml(bocaXml);

      for (var b = 0; b < bocaItems.length; b++) {
        var bItem = bocaItems[b];
        if (!bItem) continue;
        var bTitle = bItem.title || '';
        var bDesc = bItem.description || '';
        var bText = (bTitle + ' ' + bDesc).toLowerCase();

        if (bText.indexOf('菲律賓') !== -1 || bText.indexOf('philippines') !== -1 ||
            bText.indexOf('taiwan') !== -1 || bText.indexOf('馬尼拉') !== -1) {
          
          var bMatchedKeyword = null;
          var bTitleMatch = bTitle.match(NATIONWIDE_TITLE_REGEX);
          if (bTitleMatch) {
            bMatchedKeyword = bTitleMatch[0];
          } else {
            var bBodyMatch = bDesc.match(INSTITUTIONAL_DIRECTIVES_REGEX);
            if (bBodyMatch) {
              bMatchedKeyword = bBodyMatch[0];
            }
          }

          if (bMatchedKeyword) {
            var bRawKey = 'TAIWAN_BOCA|' + bItem.title + '|' + (bItem.pubDate || bItem.link);
            var bHash = computeSha256(bRawKey);

            if (!knownHashes[bHash]) {
              knownHashes[bHash] = true;
              flaggedItems.push({
                feed: 'TAIWAN_BOCA',
                title: bItem.title,
                link: bItem.link || 'https://www.boca.gov.tw/',
                keyword: bMatchedKeyword,
                hash: bHash
              });
              rowsToAppend.push([bHash, nowIso, 'TAIWAN_BOCA', bItem.title, bMatchedKeyword]);
            }
          }
        }
      }
    }
  } catch (errBoca) {
    Logger.log('Error parsing Taiwan BOCA feed: ' + errBoca.toString());
  }

  // Batch append new flagged entries to diplomatic_audit
  if (rowsToAppend.length > 0 && auditSheet) {
    var startRow = auditSheet.getLastRow() + 1;
    auditSheet.getRange(startRow, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }

  return {
    flagged: flaggedItems.length > 0,
    items: flaggedItems
  };
}

/**
 * Defensive parser for RSS 2.0 XML
 * @param {string} xmlText
 * @return {Array.<{title: string, description: string, pubDate: string, link: string}>}
 */
function parseUsStateDeptXml(xmlText) {
  var items = [];
  try {
    var document = XmlService.parse(xmlText);
    var root = document.getRootElement();
    var channel = root.getChild('channel');
    if (!channel) return items;

    var itemElements = channel.getChildren('item');
    for (var i = 0; i < itemElements.length; i++) {
      var elem = itemElements[i];
      var titleElem = elem.getChild('title');
      var descElem = elem.getChild('description');
      var pubDateElem = elem.getChild('pubDate');
      var linkElem = elem.getChild('link');

      items.push({
        title: titleElem ? titleElem.getText() : '',
        description: descElem ? descElem.getText() : '',
        pubDate: pubDateElem ? pubDateElem.getText() : '',
        link: linkElem ? linkElem.getText() : ''
      });
    }
  } catch (e) {
    // Fallback: Regex extraction if XML document parsing encounters malformed entities
    var itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    var match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      var itemBlock = match[1];
      var t = extractTagContent(itemBlock, 'title');
      var d = extractTagContent(itemBlock, 'description');
      var p = extractTagContent(itemBlock, 'pubDate');
      var l = extractTagContent(itemBlock, 'link');
      items.push({ title: t, description: d, pubDate: p, link: l });
    }
  }
  return items;
}

/**
 * Defensive parser for Atom feed XML
 * @param {string} atomText
 * @return {Array.<{id: string, title: string, summary: string, content: string, updated: string}>}
 */
function parseUkFcdoAtom(atomText) {
  var entries = [];
  try {
    var document = XmlService.parse(atomText);
    var root = document.getRootElement();
    var ns = root.getNamespace();
    var entryElems = root.getChildren('entry', ns);

    for (var i = 0; i < entryElems.length; i++) {
      var elem = entryElems[i];
      var idElem = elem.getChild('id', ns);
      var titleElem = elem.getChild('title', ns);
      var summaryElem = elem.getChild('summary', ns);
      var contentElem = elem.getChild('content', ns);
      var updatedElem = elem.getChild('updated', ns);

      entries.push({
        id: idElem ? idElem.getText() : '',
        title: titleElem ? titleElem.getText() : '',
        summary: summaryElem ? summaryElem.getText() : '',
        content: contentElem ? contentElem.getText() : '',
        updated: updatedElem ? updatedElem.getText() : ''
      });
    }
  } catch (e) {
    // Regex fallback
    var entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    var match;
    while ((match = entryRegex.exec(atomText)) !== null) {
      var block = match[1];
      entries.push({
        id: extractTagContent(block, 'id'),
        title: extractTagContent(block, 'title'),
        summary: extractTagContent(block, 'summary'),
        content: extractTagContent(block, 'content'),
        updated: extractTagContent(block, 'updated')
      });
    }
  }
  return entries;
}

/**
 * Helper tag extractor for regex XML fallback
 */
function extractTagContent(block, tag) {
  var regex = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  var m = block.match(regex);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

/**
 * Functional alias for diplomatic feed parser.
 */
function checkDiplomaticPostures() {
  return checkDiplomaticFeeds();
}

