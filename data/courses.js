/* =========================================================
   课程数据
   ---------------------------------------------------------
   每门课就是一个 { ... } 对象，字段含义：

   name          课程名
   teacher       老师
   location      上课地点
   day           星期几：1=周一 … 7=周日
   startSection  从第几节开始
   endSection    到第几节结束（连上 2 节就写 start+1）
   weeks         上课周次：
                    连着的写 [起始周, 结束周]，例如 [1, 16]
                    断开的写 [[2,3], [5,9], [11,17]]
                    （就是 2-3 周、5-9 周、11-17 周）
   parity        "all" 每周都上 / "odd" 只上单周 / "even" 只上双周

   想加一门课：复制一块，改数字即可。
   注意：最后一项后面不要留逗号。
   ========================================================= */
window.COURSE_LIST = [
  {
    name: "信息技术",
    teacher: "杨再稳",
    location: "匀东同行楼 大数据实训室207",
    day: 1,
    startSection: 3,
    endSection: 4,
    weeks: [[1,17],[19]],
    parity: "all"
  },
  {
    name: "Python基础",
    teacher: "孔令相",
    location: "匀东同行楼 路由交换实训室 325/327",
    day: 1,
    startSection: 5,
    endSection: 6,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "人工智能导论",
    teacher: "徐兴",
    location: "匀东同行楼 大数据实训室 226",
    day: 2,
    startSection: 1,
    endSection: 2,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "计算机网络基础",
    teacher: "李亮",
    location: "匀东同行楼 大数据实训室 210",
    day: 2,
    startSection: 3,
    endSection: 4,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "Python基础",
    teacher: "孔令相",
    location: "匀东同行楼 智能语音实训室 215",
    day: 2,
    startSection: 5,
    endSection: 6,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "思想道德与法治",
    teacher: "杨雅瑞",
    location: "匀东同德楼 普通教室 313",
    day: 3,
    startSection: 1,
    endSection: 2,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "计算机网络基础",
    teacher: "李亮",
    location: "匀东同行楼 通识教育实训室 212",
    day: 3,
    startSection: 3,
    endSection: 4,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "中华民族共同体概论",
    teacher: "文治露",
    location: "匀东同德楼 普通教室 313",
    day: 4,
    startSection: 1,
    endSection: 2,
    weeks: [[1, 17], [19]],
    parity: "all"
  },
  {
    name: "形势与政策1",
    teacher: "宋祥建",
    location: "匀东同德楼 普通教室 403",
    day: 4,
    startSection: 3,
    endSection: 4,
    weeks: [[12, 15]],
    parity: "all"
  },
  {
    name: "职业发展与就业指导1",
    teacher: "周老师",
    location: "匀东同德楼 普通教室 215",
    day: 4,
    startSection: 5,
    endSection: 6,
    weeks: [[2,3],[5,9],[11,17]],
    parity: "all"
  },
  {
    name: "思想道德与法治",
    teacher: "杨雅瑞",
    location: "匀东同德楼 普通教室 314",
    day: 5,
    startSection: 1,
    endSection: 2,
    weeks: [[1, 17]],
    parity: "odd"
  },
  {
    name: "体育与健康1",
    teacher: "彭明浩",
    location: "匀东运动场-田径场1",
    day: 5,
    startSection: 3,
    endSection: 4,
    weeks: [[1, 17]],
    parity: "all"
  },
  {
    name: "Python基础",
    teacher: "孔令相",
    location: "匀东同行楼 智能语音实训室 215",
    day: 5,
    startSection: 5,
    endSection: 6,
    weeks: [[1, 17], [19]],
    parity: "all"
  }
];

/* =========================================================
   整周活动：某一周不排常规课程，整张课表换成一项活动。
   格式：  "第几周": "活动名称"
   把下面的 9 改成你实际的周次；如果这学期没有整周活动，就写成 {}
   ========================================================= */
window.SPECIAL_WEEKS = {
  "9": "劳动教育（整周实训）"
};