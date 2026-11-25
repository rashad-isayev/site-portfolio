(() => {
  const buildings = [
    { id:'archive', scene:'study', detail:'The archive represents learning, education, and verified academic history. Use the text view for all currently available personal information.' },
    { id:'observatory', scene:'study', detail:'The observatory represents reflection and future interests. Only the verified details already available in this portfolio are shown here.' },
    { id:'conservatory', scene:'projects', detail:'The conservatory presents Project 1, Hour of Code, and Robotics through the existing project data.' },
    { id:'workshop', scene:'workshop', detail:'The workshop represents practical work in HTML, CSS, JavaScript, Git, and GitHub.' }
  ];

  // Adjust only the v2 sections where the painted walking surface is narrower
  // than the guide. Section limits are indexes into the manifest's route points.
  const trailAdjustments = {
    4: { radius: 10 },
    5: { radius: 15, sections: [[0, 5, 12], [42, 45, 8]] },
    6: { centers: { 7: [413, 1302] }, sections: [[6, 7, 6]] },
    7: {
      radius: 13,
      centers: { 13: [1352, 1257], 14: [1332, 1271], 16: [1295, 1310] },
      sections: [[12, 15, 9], [15, 17, 6]]
    },
    8: { radius: 13, sections: [[6, 7, 6]] },
    9: {
      centers: { 3: [443, 1732], 4: [474, 1719], 5: [506, 1713], 6: [535, 1716], 7: [568, 1730] },
      sections: [[2, 3, 10], [3, 7, 7], [7, 9, 10], [9, 13, 12]]
    }
  };

  // Art-space footprints for surfaces whose edges cannot be described by a round trail.
  // The first rectangle selects where the outline replaces the trail collision.
  const surfaces = [
    // Archive, observatory, conservatory, and workshop stairs.
    { area: [228, 487, 104, 66], outline: [[235,553],[314,553],[307,543],[300,533],[288,526],[243,526],[241,540]] },
    { area: [403, 160, 128, 51], outline: [[425,211],[522,211],[511,203],[500,195],[433,195],[425,203]] },
    { area: [1085, 175, 112, 56], outline: [[1098,231],[1187,231],[1182,224],[1169,212],[1117,212],[1108,224]] },
    { area: [1138, 446, 129, 58], outline: [[1158,504],[1245,504],[1237,494],[1228,484],[1175,484],[1166,494]] },
    // Village bridge and its north fork, then the Moonpool bridge.
    { area: [836, 445, 126, 76], outline: [[836,499],[853,485],[878,475],[875,458],[877,445],[903,445],[901,463],[902,473],[928,476],[962,481],[962,502],[939,499],[919,491],[897,488],[873,498],[851,513],[836,519]] },
    { area: [443, 1690, 128, 55], outline: [[443,1724],[460,1714],[480,1708],[507,1704],[534,1708],[554,1717],[571,1723],[571,1740],[548,1731],[531,1722],[506,1720],[481,1726],[455,1739],[443,1745]] },
    // Lantern Spring stepping stones and the lower Waterfall Overlook.
    { area: [1243, 1292, 73, 56], outline: [[1243,1337],[1258,1325],[1278,1315],[1290,1308],[1291,1299],[1303,1292],[1316,1292],[1304,1306],[1301,1322],[1283,1327],[1264,1339],[1243,1348]] },
    { area: [1215, 1523, 96, 63], outline: [[1230,1564],[1241,1554],[1256,1551],[1276,1552],[1288,1559],[1300,1562],[1311,1565],[1311,1582],[1284,1581],[1265,1583],[1244,1577],[1231,1572]] }
  ];

  // Only the near rail and posts are redrawn over the player.
  const bridgeForeground = [
    {
      feet: [829, 472, 145, 45],
      outlines: [
        [[849,491],[852,487],[862,486],[871,490],[871,497],[869,500],[869,529],[853,534],[850,524]],
        [[867,491],[894,478],[898,482],[897,487],[869,500]],
        [[894,475],[897,470],[906,469],[912,473],[913,483],[910,487],[910,506],[899,509],[896,503],[896,486]],
        [[911,479],[945,477],[950,480],[948,486],[912,487]],
        [[942,470],[945,466],[955,466],[961,471],[961,507],[958,516],[948,519],[944,510],[944,483]]
      ]
    },
    {
      feet: [440, 1703, 132, 37],
      outlines: [
        [[450,1706],[457,1708],[466,1704],[466,1719],[462,1723],[453,1723],[448,1719]],
        [[465,1707],[483,1701],[500,1698],[521,1698],[541,1703],[553,1708],[553,1714],[540,1709],[521,1704],[503,1704],[485,1707],[465,1714]],
        [[503,1703],[514,1703],[513,1719],[504,1719]],
        [[552,1707],[559,1709],[564,1704],[568,1707],[568,1720],[564,1724],[555,1723],[551,1720]]
      ]
    }
  ];

  function createOutdoor(manifest) {
    const { width, height, worldScale: scale, walkable, landmarks } = manifest;
    const segments = walkable.routes.flatMap((route, index) => {
      const adjustment = trailAdjustments[index];
      const points = route.points.map((point, pointIndex) => {
        const [x, y] = adjustment?.centers?.[pointIndex] ?? point;
        return [x * scale, y * scale];
      });
      return points.slice(1).map(([bx, by], segmentIndex) => {
        const [ax, ay] = points[segmentIndex];
        const section = adjustment?.sections?.find(([start, end]) => segmentIndex >= start && segmentIndex < end);
        const radius = (section?.[2] ?? adjustment?.radius ?? route.radius) * scale;
        const dx = bx - ax;
        const dy = by - ay;
        return {
          ax, ay, dx, dy, lengthSquared: dx * dx + dy * dy, radiusSquared: radius * radius,
          left: Math.min(ax, bx) - radius, right: Math.max(ax, bx) + radius,
          top: Math.min(ay, by) - radius, bottom: Math.max(ay, by) + radius
        };
      });
    });

    return {
      scale,
      artWidth: width,
      artHeight: height,
      spawn: { x: 722 * scale, y: 1234 * scale },
      surfaces: surfaces.map(({ area, outline }) => ({
        area: area.map(value => value * scale),
        outline: outline.map(([x, y]) => [x * scale, y * scale])
      })),
      bridgeForeground: bridgeForeground.map(layer => {
        const points = layer.outlines.flat();
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        return { ...layer, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
      }),
      bounds: { w: width * scale, h: height * scale },
      segments,
      locations: landmarks.map(({ name, x, y }, index) => ({
        ...buildings[index], name, x: x * scale, y: y * scale
      }))
    };
  }

  window.PortfolioWorldData = {
    createOutdoor,
    study: {
      spawn: { x:320, y:420 }, bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[88,98,464,32],[170,220,300,62]],
      content: { title:'Learning Study', text:'This room represents my education and learning journey. Verified qualifications and academic experiences can be maintained in the portfolio profile data.', signs:['Study','Notes','Build'] }
    },
    workshop: {
      spawn: { x:320, y:420 }, bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[88,92,464,28],[170,210,300,82]],
      content: { title:'Developer Workshop', text:'HTML, CSS, JavaScript, Git, and GitHub are represented here as practical tools used in portfolio and academic projects.', signs:['Code','Git','Make'] }
    },
    projects: {
      spawn: { x:320, y:420 }, bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[78,104,484,36],[160,230,320,86]],
      content: { title:'Project Terrace', text:'The project displays represent real work from the portfolio: Project 1, Hour of Code, and Robotics.', signs:['Project 1','Hour of Code','Robotics'] }
    }
  };
})();
