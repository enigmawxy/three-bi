#### THREE-BI系统
一个基于THREE开发的交互式报表系统

#### 安装
1、克隆本项目
2、依次运行如下命令：
```javascript
npm install
npm install three@0.84.0
npm start
```

#### 未解决的问题
1、贝塞尔曲线上的粒子系统在使用了three 0.84.0版本后，由于Geometry在支持attributes上的改变导致粒子系统不工作
2、地球本身的渲染，也是上述1的原因不能正常工作。
