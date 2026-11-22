(() => {
  const scale = 1.25;
  const artPoints = points => points.map(([x, y]) => [x * scale, y * scale]);

  window.PortfolioWorldData = {
    outdoor: {
      spawn: { x: 755 * scale, y: 955 * scale },
      bounds: { w: 1920, h: 1280 },
      routes: [
        { radius: 21 * scale, points: artPoints([[755,955],[758,928],[753,905],[735,879],[697,857],[638,835],[607,809],[599,784],[617,761],[651,740],[709,720],[761,706],[802,686],[819,662],[808,640],[783,616],[753,598],[729,576],[707,568],[649,555],[597,548],[545,545],[498,545],[446,554],[389,564],[330,567],[289,556],[266,544]]) },
        { radius: 17 * scale, points: artPoints([[498,545],[484,519],[480,492],[490,466],[499,441],[495,421],[473,401],[442,379],[426,361],[427,339],[442,321],[473,301],[504,279],[508,256],[499,237],[479,222],[464,210]]) },
        { radius: 15 * scale, points: artPoints([[716,573],[748,548],[783,532],[818,517],[842,507],[872,495],[903,486],[934,491],[969,498],[1020,500],[1067,512],[1127,520],[1185,518],[1203,504]]) },
        { radius: 17 * scale, points: artPoints([[884,490],[882,466],[883,440],[904,415],[931,394],[962,380],[1000,363],[1029,346],[1041,326],[1034,301],[1033,281],[1053,268],[1085,255],[1125,245],[1143,232]]) }
      ],
      locations: [
        { id:'archive', name:'Mothlight Archive', x:266*scale, y:544*scale, radius:62, door:[266*scale-32,544*scale-24,64,48], scene:'study', short:'Learning and academic history', detail:'The archive represents learning, education, and verified academic history. Use the text view for all currently available personal information.' },
        { id:'observatory', name:'Starfall Observatory', x:464*scale, y:210*scale, radius:62, door:[464*scale-32,210*scale-24,64,48], scene:'study', short:'Goals and reflection', detail:'The observatory represents reflection and future interests. Only the verified details already available in this portfolio are shown here.' },
        { id:'conservatory', name:'Glasscap Conservatory', x:1143*scale, y:232*scale, radius:62, door:[1143*scale-32,232*scale-24,64,48], scene:'projects', short:'Projects and experiments', detail:'The conservatory presents Project 1, Hour of Code, and Robotics through the existing project data.' },
        { id:'workshop', name:'Tidemaker’s Workshop', x:1203*scale, y:504*scale, radius:62, door:[1203*scale-32,504*scale-24,64,48], scene:'workshop', short:'Skills and development', detail:'The workshop represents practical work in HTML, CSS, JavaScript, Git, and GitHub.' }
      ]
    },
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
