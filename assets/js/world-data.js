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

  function createOutdoor(manifest) {
    const { width, height, worldScale: scale, spawn, walkable, landmarks } = manifest;
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
      spawn: { x: spawn.x * scale, y: spawn.y * scale },
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
