const translatePos = {
  // set defualt div  apperent
  x: window.innerWidth / 2,
  y: window.innerHeight / 4,
};
const initialPoints = [
  // default positon point
  [-150, 50],
  [-130, -150],
  [-10, -70],
  [0, 80],
  [80, -70],
  [130, -130],
].map((pointData) => {
  pointData[0] = pointData[0] + translatePos.x;
  pointData[1] = pointData[1] + translatePos.y;
  return pointData;
});
const initialEdges = [
  // edges default
  "A_B",
  "A_C",
  "A_D",
  "B_F",
  "C_B",
  "C_E",
  "C_D",
  "D_E",
  "E_F",
];
const points = [];
const edges = [];
const canvas = document.getElementById("canvas");
const $canvas = $(canvas);
const ctx = canvas.getContext("2d");
const toolsNames = {
  select: 0,
  addPoint: 1,
  addEdge: 2,
};
const tools = Object.keys(toolsNames).map((toolName) => {
  return {
    name: toolName,
    $html: $("#btn_" + toolName),
  };
});

const $notification = $("#notification");
const $btnRunAlgorithm = $("#btn_run_algorithm");
const $icon = $btnRunAlgorithm.find(".icon");
const $wrapAnimationSpeed = $("#wrap_animationSpeed");
const $animationSpeedText = $wrapAnimationSpeed.find("span");
const $animationSpeedInput = $wrapAnimationSpeed.find("input");
const $from = $("#from");
const $to = $("#to");
const dragPos = { x: 0, y: 0 };
let animationSpeed = 00;
let notificationTimeout;
let runningTimeout;
let running = false;
let trackedCosts = {};
let processedNodes = [];
let trackedParents = {};
let optimalPath = [];
let startName;
let endName;
let graph;
let hoverPoint;
let holdingPoint;
let tmpEdge;
let activeToolIdx = 0;

function createPointHtml(point) {
  // chỗ chọn điểm xp(form) giúp chạy giao điện thuật toán
  const $option = $(document.createElement("option"));
  $option.html(point.name);
  $option.val(point.name);
  $from.append($option.clone());
  $to.append($option.clone());
}

function addNewEdge(pointA, pointB) {
  // line between points + info của edges này luôn.
  if (pointA === pointB || getEdge(pointA.name, pointB.name) !== null) {
    return;
  }
  edges.push({
    name: `${pointA.name}_${pointB.name}`,
    a: pointA,
    b: pointB,
    cost: null,
  });
  updateEdgesCost();
}
function updateEdgesCost() {
  //tính cost ở các điểm.
  edges.forEach((edge) => {
    edge.cost = parseInt(
      getPointsDistance(edge.a.x, edge.a.y, edge.b.x, edge.b.y),
      10
    );
  });
}
function getPointsDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
} // tới đây là tạo xog node + connect edges lại với nhau.
///////////////////////////////////////

function selectTool(toolIdx) {
  // click -> point + add edges
  activeToolIdx = toolIdx;
  // click in form
  tools.forEach((tool) => tool.$html.removeClass("active"));
  tools[activeToolIdx].$html.addClass("active");
}

function onRunClick() {
  if (!running) {
    runAlgorithm();
    return;
  }

  // click icon play.
  if ($icon.hasClass("fa-pause")) {
    $icon.removeClass("fa-pause").addClass("fa-play");
    runningTimeout.pause();
    notificationTimeout.pause();
  } else {
    $icon.removeClass("fa-play").addClass("fa-pause");
    runningTimeout.resume();
    notificationTimeout.resume();
  }
}

function runAlgorithm() {
  running = true;
  $icon.removeClass("fa-play").addClass("fa-pause");
  createDijkstraGraph();
  runDijkstra();
}

function createDijkstraGraph() {
  // tạo matrix default + add giá trị của bờ vào.
  graph = {};
  // let pointsName;
  let pointA;
  let pointB;
  //points có sắn từ pointData: 588
  points.forEach((point) => (graph[point.name] = {})); // add list edges
  edges.forEach((edge) => {
    // pointsName = edge.name.split("_");
    // tạo value cho matrix
    graph[edge.a.name][edge.b.name] = edge.cost;
    graph[edge.b.name][edge.a.name] = edge.cost;
  });
}

function runDijkstra() {
  startName = $from.val();
  endName = $to.val();
  // khi demo chạy xong + click button quay về default
  resetGraph();

  points.forEach((point) => {
    // mảng lưu + cập nhật lại giá trị của node.
    trackedCosts[point.name] = Infinity;
  });
  trackedCosts[startName] = 0;
  calculateNode(); //tạo graph + render rồi chưa có animation.
}

function resetGraph() {
  // khi chạy xong click run -> back state default
  edges.forEach((edge) => {
    edge.shortestPath = false;
    edge.processed = false;
  });

  points.forEach((point) => {
    point.processed = false;
  });

  trackedCosts = {};
  processedNodes = [];
  trackedParents = {};
  optimalPath = [];
  if (runningTimeout) {
    clearTimeout(runningTimeout);
  }
}

//trackedCosts: có all node + khởi tạo giá trị cho node đó là Infinity.
// processedNodes vấn là rỗng.
function calculateNode() {
  const node = findLowestCostNode(); // trả về name point 'A' tên node thôi ko có gtri
  showNotification(`Get lowest cost non-visited node: ${node}`, animationSpeed);

  if (!node) {
    // khi nào chạy xog al thì tính đường tối ưu + reder ra.
    calculatePath();
    return;
  }

  processedNodes.push(node);
  updateCanvas();
  runningTimeout = new Timer(() => {
    calculateChilds(node, 0); // 0 chạy điểm liền kề đầu tiên với node.
  }, animationSpeed);
}

function findLowestCostNode() {
  // duyệt mảng cost + check node -> tìm ra point nhỏ nhất + chưa check.
  const costs = trackedCosts;
  const processed = processedNodes; // arr đỉnh đã duyệt.
  const knownNodes = Object.keys(costs);

  const lowestCostNode = knownNodes.reduce((acc, node) => {
    let lowest = acc;
    if (lowest === null && !processed.includes(node)) {
      // khởi tạo ban đầu là node + not check -> chọn node đầu gán vào đây
      lowest = node;
    }
    if (costs[node] < costs[lowest] && !processed.includes(node)) {
      // đem node đã gán đi so sánh.
      lowest = node;
    }
    return lowest;
  }, null);

  return lowestCostNode;
}
function showNotification(text, duration) {
  $notification.removeClass("hide").html(text);

  notificationTimeout = new Timer(() => {
    $notification.addClass("hide");
  }, duration);
}
// Tìm khoảng cách ngắn nhất từ node ban đầu đến node hiện tại.
function calculateChilds(node, index) {
  // Tính các đinh xung quanh node //A: {B: 200, C: 184, D: 152}
  // thuật toán dijstrak này ~ thay vì dùng while thì dùng đệ quy.
  const childsKeys = Object.keys(graph[node]); //key của đỉnh xung quanh node đó.
  const costToReachNode = trackedCosts[node]; //cost min để tới node đó
  const childrenOfNode = graph[node]; //đỉnh xung quanh node.
  const child = childsKeys[index]; // B
  const costFromNodetoChild = childrenOfNode[child];
  const costToChild = costToReachNode + costFromNodetoChild;
  const edge = getEdge(node, child); // check xem node anf child co bo hay ko
  // trả về a, b
  if (!child) {
    calculateNode();
    return;
  }
  if (edge.processed) {
    // bo đã duyệt thì bỏ qua.
    calculateChilds(node, index + 1); // index vuot -> undefined het phan goi calculateNode
    return;
  }
  if (!trackedCosts[child] || trackedCosts[child] > costToChild) {
    showNotification(
      `Calculate ${node}-${child}: ${costToChild} < ${trackedCosts[child]}, So updating ${child} new cost...`,
      animationSpeed
    );
    trackedCosts[child] = costToChild; // cap nhat value cua dinh
    trackedParents[child] = node;
  } else {
    showNotification(
      `Calculate ${node}-${child}: ${costToChild} > ${trackedCosts[child]}, maintain ${child} cost...`,
      animationSpeed
    );
  }
  edge.processed = true;
  updateCanvas();

  runningTimeout = new Timer(() => {
    calculateChilds(node, index + 1); // tiếp tục duyệt node kề với A
  }, animationSpeed);
  // duyệt rồi gọi lại calculateNode -> duyệt node khác.
} // chayj thuatj toan

function calculatePath() {
  let parent = endName;
  let nextParent;
  let edge;
  // tìm con đường từ point cuối.
  while (parent) {
    optimalPath.push(parent);
    nextParent = trackedParents[parent];
    if (nextParent) {
      // set stautus cho bờ.
      edge = getEdge(parent, nextParent);
      edge.shortestPath = true;
    }
    parent = nextParent;
  }

  optimalPath.reverse();
  const results = {
    distance: trackedCosts[endName],
    path: optimalPath,
  };

  console.log("Results", results);
  console.log("Edges", edges);
  console.log("Graph", graph);
  console.log("TrackedParents", trackedParents);
  updateCanvas(); // là line xanh
  $icon.removeClass("fa-pause").addClass("fa-play");
  running = false;
}
///////////////////////////////////////
function updateCanvas() {
  ctx.fillStyle = "#fff"; // backgroun
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  if (tmpEdge) {
    drawTmpEdge();
  }
  edges.forEach((edge) => {
    ctx.strokeStyle = !edge.shortestPath ? "#000" : "#ff0000";
    if (edge.processed) {
      ctx.strokeStyle = "#ff0000";
    }
    if (edge.shortestPath) {
      ctx.strokeStyle = "#00ff00";
    }
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(edge.a.x, edge.a.y);
    ctx.lineTo(edge.b.x, edge.b.y);
    ctx.stroke();
    ctx.closePath();

    ctx.font = "12px Arial";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000";
    ctx.fillText(
      edge.cost,
      (edge.a.x + edge.b.x) / 2 + 5,
      (edge.a.y + edge.b.y) / 2 + 8
    );
  });
  points.forEach((point) => {
    ctx.fillStyle = "#fff";
    const isProcessed = processedNodes.includes(point.name);
    const cost = trackedCosts[point.name];
    if (isProcessed) {
      ctx.fillStyle = "#ff0000";
    }
    // if (point.processing) {
    //   ctx.fillStyle = "#00ff00";
    // }
    if (optimalPath.indexOf(point.name) !== -1) {
      ctx.fillStyle = "#00ff00";
    }
    ctx.strokeStyle = "#142f9a";
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.hover ? 7 : 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.fillStyle = !isProcessed ? "#000" : "#ff0000";
    ctx.font = "bold 20px Arial";
    ctx.textBaseline = "top";
    ctx.fillText(point.name, point.x + 5, point.y + 8);

    if (cost) {
      ctx.font = "bold 11px Arial";
      ctx.fillText(
        `(${cost === Infinity ? "∞" : cost})`,
        point.x + 20,
        point.y + 8
      );
    }
  });
}
function drawTmpEdge() {
  ctx.strokeStyle = "#000";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.moveTo(tmpEdge.a.x, tmpEdge.a.y);
  ctx.lineTo(tmpEdge.b.x, tmpEdge.b.y);
  ctx.stroke();
  ctx.closePath();
  ctx.setLineDash([]);
}
function onMouseMove(evt) {
  const state = { evt, needUpdate: false, cursor: null };

  updateHoverPoint(state);

  switch (activeToolIdx) {
    case toolsNames.addEdge:
      if (hoverPoint) {
        state.cursor = "crosshair";
      }
      if (tmpEdge) {
        tmpEdge.b.x = evt.clientX;
        tmpEdge.b.y = evt.clientY;
        state.needUpdate = true;
      }
      break;
    case toolsNames.addPoint:
      state.cursor = "cell";
      if (hoverPoint) {
        state.cursor = "no-drop";
      }
      break;
    case toolsNames.select:
      if (hoverPoint) {
        state.cursor = "grab";
      }

      if (holdingPoint) {
        onDragPoint(state);
      }
      break;
  }

  $canvas.css({ cursor: state.cursor || "" });

  if (state.needUpdate) {
    updateCanvas();
  }
}
function updateHoverPoint(state) {
  let dist;
  let minDist = 10;
  points.forEach((point) => {
    dist = getPointsDistance(
      state.evt.clientX,
      state.evt.clientY,
      point.x,
      point.y
    );
    if (point.hover && dist >= minDist) {
      hoverPoint = null;
      point.hover = false;
      state.needUpdate = true;
      return;
    }
    point.hover = false;
    if (dist < minDist) {
      hoverPoint = point;
      hoverPoint.hover = true;
      state.needUpdate = true;
    }
  });
}
function onDragPoint(state) {
  const { evt } = state;
  const { x, y } = dragPos;
  holdingPoint.x = holdingPoint.x + (evt.clientX - x);
  holdingPoint.y = holdingPoint.y + (evt.clientY - y);
  dragPos.x = evt.clientX;
  dragPos.y = evt.clientY;
  updateEdgesCost();
  state.cursor = "grabbing";
  state.needUpdate = true;
}
function onMouseDown(evt) {
  if (evt.target !== canvas) {
    return;
  }

  switch (activeToolIdx) {
    case toolsNames.addEdge:
      if (!hoverPoint) {
        return;
      }

      tmpEdge = {
        a: hoverPoint,
        b: { x: evt.clientX, y: evt.clientY },
      };
      break;
    case toolsNames.addPoint:
      if (hoverPoint) {
        return;
      }

      addNewPoint(evt.clientX, evt.clientY);
      break;
    case toolsNames.select:
      if (!hoverPoint) {
        return;
      }

      dragPos.x = evt.clientX;
      dragPos.y = evt.clientY;
      holdingPoint = hoverPoint;
      break;
  }

  $(document).on("mouseup", onMouseUp);
}
function addNewPoint(x, y) {
  const pointData = {
    name: String.fromCharCode(65 + points.length),
    x,
    y,
  };
  points.push(pointData);
  createPointHtml(pointData);
  updateCanvas();
}
function onMouseUp(evt) {
  switch (activeToolIdx) {
    case toolsNames.addEdge:
      if (tmpEdge && hoverPoint) {
        addNewEdge(tmpEdge.a, hoverPoint);
      }
      tmpEdge = null;
      updateCanvas();
      break;
    case toolsNames.select:
      holdingPoint = null;
      break;
  }

  $(document).off("mouseup", onMouseUp);
} // animation point
///////////////////////////////////////

function onWindowResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateCanvas();
}

//hhre
function Timer(callback, delay) {
  var timerId,
    start,
    remaining = delay;

  this.pause = function () {
    window.clearTimeout(timerId);
    remaining -= Date.now() - start;
  };

  this.resume = function () {
    start = Date.now();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining);
  };

  this.resume();
}

function getEdge(aName, bName) {
  let foundEdge = null;
  // let pointsName;
  edges.every((edge) => {
    // pointsName = edge.name.split("_");

    if (
      (edge.a.name === aName && edge.b.name === bName) ||
      (edge.b.name === aName && edge.a.name === bName)
    ) {
      foundEdge = edge;
      return false;
    }

    return true;
  });
  return foundEdge;
}

function getPoint(name) {
  return points[name.charCodeAt(0) - 65];
}

function onAnimationSpeedChange(evt) {
  $animationSpeedText.html(`(${evt.currentTarget.value})`);
  animationSpeed = parseInt(evt.currentTarget.value, 10);
}

function initialize() {
  // Points
  initialPoints.forEach((pointPos) => {
    // get data available -> create point on web
    const pointData = {
      name: String.fromCharCode(65 + points.length),
      x: pointPos[0],
      y: pointPos[1],
    };
    points.push(pointData);
    createPointHtml(pointData);
  });
  $to.val(points[points.length - 1].name);

  // Edges
  let pointA;
  let pointB;
  initialEdges.forEach((edgeName) => {
    pointA = points[edgeName.charCodeAt(0) - 65];
    pointB = points[edgeName.charCodeAt(2) - 65];
    addNewEdge(pointA, pointB);
  });

  // Tools chắc là để để chọn -> kéo đi
  tools.forEach((tool, i) => tool.$html.on("click", () => selectTool(i)));
  selectTool(toolsNames.select);
  // run algofithms + visualization.
  $btnRunAlgorithm.on("click", onRunClick);
  $animationSpeedInput.on("change", onAnimationSpeedChange);

  // animation mouse(pull, click) on web with point
  $(document).on("mousemove", onMouseMove).on("mousedown", onMouseDown);
  $(window).on("resize", onWindowResize);

  $notification.addClass("hide");
  onWindowResize();
}

initialize();

/* rút
 - edges array tổng -> bỏ bờ vào.
*/
// HT: i want to figured flow data + know initialize original.

/*
145 ko bk những cái khởi tạo + truy xuất tư đầu ra luôn.
152 ko có là ko có chạy chấm xanh + trực quan luôn.
154 ko cập nhật ∞ 
164,165 .val() ko bk làm gi luôn.

// visualization (? này chạy cùng với thuật toán HAY sử dụng kq -> demo lại.
272 drawTmpEdge làm gì??? tắt rồi vẫn chạy
*/
