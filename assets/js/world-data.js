(() => {
  window.PortfolioWorldData = {
    outdoor: {
      spawn: { x: 480, y: 300 },
      bounds: { w: 960, h: 540 },
      collisions: [
        [0,0,960,24],[0,516,960,24],[0,0,24,540],[936,0,24,540],
        [170,92,190,118],[600,92,190,118],[382,330,196,116],
        [94,360,72,36],[794,360,72,36]
      ],
      locations: [
        { id:'study', name:'Learning Study', x:265, y:210, radius:62, door:[250,188,80,22], scene:'study', short:'Education and learning', detail:'My learning journey is grounded in information systems, programming, and practical experimentation.' },
        { id:'workshop', name:'Developer Workshop', x:695, y:210, radius:62, door:[680,188,80,22], scene:'workshop', short:'Skills and tools', detail:'This workshop represents the technical skills I use while building projects and exploring ideas.' },
        { id:'projects', name:'Project Terrace', x:480, y:446, radius:62, door:[462,426,36,22], scene:'projects', short:'Selected work', detail:'Project 1, Hour of Code, and Robotics are presented through the project displays.' },
        { id:'garden', name:'Reflection Garden', x:116, y:378, radius:58, door:null, scene:'outdoor', short:'Interests and goals', detail:'Verified interests and goals will appear here. Nothing personal is invented by the world.' }
      ]
    },
    study: {
      spawn: { x:320, y:420 },
      bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[88,98,464,32],[170,220,300,62]],
      content: { title:'Learning Study', text:'This room represents my education and learning journey. Verified qualifications and academic experiences can be maintained in the portfolio profile data.', signs:['Study', 'Notes', 'Build'] }
    },
    workshop: {
      spawn: { x:320, y:420 },
      bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[88,92,464,28],[170,210,300,82]],
      content: { title:'Developer Workshop', text:'HTML, CSS, JavaScript, Git, and GitHub are represented here as practical tools used in portfolio and academic projects.', signs:['Code', 'Git', 'Make'] }
    },
    projects: {
      spawn: { x:320, y:420 },
      bounds: { w:640, h:480 },
      collisions: [[0,0,640,34],[0,446,640,34],[0,0,34,480],[606,0,34,480],[78,104,484,36],[160,230,320,86]],
      content: { title:'Project Terrace', text:'The project displays represent real work from the portfolio: Project 1, Hour of Code, and Robotics. Details and images should remain authentic.', signs:['Project 1', 'Hour of Code', 'Robotics'] }
    }
  };
})();
