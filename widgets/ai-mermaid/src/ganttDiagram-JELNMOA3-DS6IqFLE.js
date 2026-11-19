import{g as ke,s as ye,p as ge,o as pe,a as ve,b as Te,_ as c,c as rt,d as xe,l as et,j as be,i as we,x as _e,u as De}from"./mermaid.core-BP_Gsxyg.js";import{g as se,d as R}from"./dayjs.min-HUL16pJc.js";import{h as Se,j as Ce}from"./app.js";import{s as ht}from"./d3-shape-BL8tCJGM.js";import{t as Ee,j as Ie,m as Me,l as Ae,p as Fe,q as Ht,u as jt,v as $e,w as Le,x as Ye,y as We,A as Oe,B as Ve,C as Pe,D as qt,E as Xt,F as Gt,G as Ut,H as Kt}from"./d3-scale-BrZnfznE.js";function Ne(t){return t}var kt=1,Dt=2,Ct=3,mt=4,Jt=1e-6;function Re(t){return"translate("+t+",0)"}function ze(t){return"translate(0,"+t+")"}function Be(t){return i=>+t(i)}function He(t,i){return i=Math.max(0,t.bandwidth()-i*2)/2,t.round()&&(i=Math.round(i)),r=>+t(r)+i}function je(){return!this.__axis}function re(t,i){var r=[],n=null,a=null,m=6,T=6,E=3,A=typeof window<"u"&&window.devicePixelRatio>1?0:.5,M=t===kt||t===mt?-1:1,S=t===mt||t===Dt?"x":"y",Y=t===kt||t===Ct?Re:ze;function _(x){var O=n??(i.ticks?i.ticks.apply(i,r):i.domain()),D=a??(i.tickFormat?i.tickFormat.apply(i,r):Ne),U=Math.max(m,0)+E,P=i.range(),X=+P[0]+A,N=+P[P.length-1]+A,B=(i.bandwidth?He:Be)(i.copy(),A),H=x.selection?x.selection():x,I=H.selectAll(".domain").data([null]),g=H.selectAll(".tick").data(O,i).order(),d=g.exit(),u=g.enter().append("g").attr("class","tick"),p=g.select("line"),v=g.select("text");I=I.merge(I.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),g=g.merge(u),p=p.merge(u.append("line").attr("stroke","currentColor").attr(S+"2",M*m)),v=v.merge(u.append("text").attr("fill","currentColor").attr(S,M*U).attr("dy",t===kt?"0em":t===Ct?"0.71em":"0.32em")),x!==H&&(I=I.transition(x),g=g.transition(x),p=p.transition(x),v=v.transition(x),d=d.transition(x).attr("opacity",Jt).attr("transform",function(y){return isFinite(y=B(y))?Y(y+A):this.getAttribute("transform")}),u.attr("opacity",Jt).attr("transform",function(y){var h=this.parentNode.__axis;return Y((h&&isFinite(h=h(y))?h:B(y))+A)})),d.remove(),I.attr("d",t===mt||t===Dt?T?"M"+M*T+","+X+"H"+A+"V"+N+"H"+M*T:"M"+A+","+X+"V"+N:T?"M"+X+","+M*T+"V"+A+"H"+N+"V"+M*T:"M"+X+","+A+"H"+N),g.attr("opacity",1).attr("transform",function(y){return Y(B(y)+A)}),p.attr(S+"2",M*m),v.attr(S,M*U).text(D),H.filter(je).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",t===Dt?"start":t===mt?"end":"middle"),H.each(function(){this.__axis=B})}return _.scale=function(x){return arguments.length?(i=x,_):i},_.ticks=function(){return r=Array.from(arguments),_},_.tickArguments=function(x){return arguments.length?(r=x==null?[]:Array.from(x),_):r.slice()},_.tickValues=function(x){return arguments.length?(n=x==null?null:Array.from(x),_):n&&n.slice()},_.tickFormat=function(x){return arguments.length?(a=x,_):a},_.tickSize=function(x){return arguments.length?(m=T=+x,_):m},_.tickSizeInner=function(x){return arguments.length?(m=+x,_):m},_.tickSizeOuter=function(x){return arguments.length?(T=+x,_):T},_.tickPadding=function(x){return arguments.length?(E=+x,_):E},_.offset=function(x){return arguments.length?(A=+x,_):A},_}function qe(t){return re(kt,t)}function Xe(t){return re(Ct,t)}var yt={exports:{}},Ge=yt.exports,Qt;function Ue(){return Qt||(Qt=1,(function(t,i){(function(r,n){t.exports=n()})(Ge,(function(){var r="day";return function(n,a,m){var T=function(M){return M.add(4-M.isoWeekday(),r)},E=a.prototype;E.isoWeekYear=function(){return T(this).year()},E.isoWeek=function(M){if(!this.$utils().u(M))return this.add(7*(M-this.isoWeek()),r);var S,Y,_,x,O=T(this),D=(S=this.isoWeekYear(),Y=this.$u,_=(Y?m.utc:m)().year(S).startOf("year"),x=4-_.isoWeekday(),_.isoWeekday()>4&&(x+=7),_.add(x,r));return O.diff(D,"week")+1},E.isoWeekday=function(M){return this.$utils().u(M)?this.day()||7:this.day(this.day()%7?M:M-7)};var A=E.startOf;E.startOf=function(M,S){var Y=this.$utils(),_=!!Y.u(S)||S;return Y.p(M)==="isoweek"?_?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):A.bind(this)(M,S)}}}))})(yt)),yt.exports}var Ke=Ue();const Je=se(Ke);var gt={exports:{}},Qe=gt.exports,Zt;function Ze(){return Zt||(Zt=1,(function(t,i){(function(r,n){t.exports=n()})(Qe,(function(){var r,n,a=1e3,m=6e4,T=36e5,E=864e5,A=31536e6,M=2628e6,S=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,Y=/\[([^\]]+)]|YYYY|YY|Y|M{1,2}|D{1,2}|H{1,2}|m{1,2}|s{1,2}|SSS/g,_={years:A,months:M,days:E,hours:T,minutes:m,seconds:a,milliseconds:1,weeks:6048e5},x=function(I){return I instanceof B},O=function(I,g,d){return new B(I,d,g.$l)},D=function(I){return n.p(I)+"s"},U=function(I){return I<0},P=function(I){return U(I)?Math.ceil(I):Math.floor(I)},X=function(I){return Math.abs(I)},N=function(I,g){return I?U(I)?{negative:!0,format:""+X(I)+g}:{negative:!1,format:""+I+g}:{negative:!1,format:""}},B=(function(){function I(d,u,p){var v=this;if(this.$d={},this.$l=p,d===void 0&&(this.$ms=0,this.parseFromMilliseconds()),u)return O(d*_[D(u)],this);if(typeof d=="number")return this.$ms=d,this.parseFromMilliseconds(),this;if(typeof d=="object")return Object.keys(d).forEach((function(o){v.$d[D(o)]=d[o]})),this.calMilliseconds(),this;if(typeof d=="string"){var y=d.match(S);if(y){var h=y.slice(2).map((function(o){return o!=null?Number(o):0}));return this.$d.years=h[0],this.$d.months=h[1],this.$d.weeks=h[2],this.$d.days=h[3],this.$d.hours=h[4],this.$d.minutes=h[5],this.$d.seconds=h[6],this.calMilliseconds(),this}}return this}var g=I.prototype;return g.calMilliseconds=function(){var d=this;this.$ms=Object.keys(this.$d).reduce((function(u,p){return u+(d.$d[p]||0)*_[p]}),0)},g.parseFromMilliseconds=function(){var d=this.$ms;this.$d.years=P(d/A),d%=A,this.$d.months=P(d/M),d%=M,this.$d.days=P(d/E),d%=E,this.$d.hours=P(d/T),d%=T,this.$d.minutes=P(d/m),d%=m,this.$d.seconds=P(d/a),d%=a,this.$d.milliseconds=d},g.toISOString=function(){var d=N(this.$d.years,"Y"),u=N(this.$d.months,"M"),p=+this.$d.days||0;this.$d.weeks&&(p+=7*this.$d.weeks);var v=N(p,"D"),y=N(this.$d.hours,"H"),h=N(this.$d.minutes,"M"),o=this.$d.seconds||0;this.$d.milliseconds&&(o+=this.$d.milliseconds/1e3,o=Math.round(1e3*o)/1e3);var l=N(o,"S"),k=d.negative||u.negative||v.negative||y.negative||h.negative||l.negative,f=y.format||h.format||l.format?"T":"",b=(k?"-":"")+"P"+d.format+u.format+v.format+f+y.format+h.format+l.format;return b==="P"||b==="-P"?"P0D":b},g.toJSON=function(){return this.toISOString()},g.format=function(d){var u=d||"YYYY-MM-DDTHH:mm:ss",p={Y:this.$d.years,YY:n.s(this.$d.years,2,"0"),YYYY:n.s(this.$d.years,4,"0"),M:this.$d.months,MM:n.s(this.$d.months,2,"0"),D:this.$d.days,DD:n.s(this.$d.days,2,"0"),H:this.$d.hours,HH:n.s(this.$d.hours,2,"0"),m:this.$d.minutes,mm:n.s(this.$d.minutes,2,"0"),s:this.$d.seconds,ss:n.s(this.$d.seconds,2,"0"),SSS:n.s(this.$d.milliseconds,3,"0")};return u.replace(Y,(function(v,y){return y||String(p[v])}))},g.as=function(d){return this.$ms/_[D(d)]},g.get=function(d){var u=this.$ms,p=D(d);return p==="milliseconds"?u%=1e3:u=p==="weeks"?P(u/_[p]):this.$d[p],u||0},g.add=function(d,u,p){var v;return v=u?d*_[D(u)]:x(d)?d.$ms:O(d,this).$ms,O(this.$ms+v*(p?-1:1),this)},g.subtract=function(d,u){return this.add(d,u,!0)},g.locale=function(d){var u=this.clone();return u.$l=d,u},g.clone=function(){return O(this.$ms,this)},g.humanize=function(d){return r().add(this.$ms,"ms").locale(this.$l).fromNow(!d)},g.valueOf=function(){return this.asMilliseconds()},g.milliseconds=function(){return this.get("milliseconds")},g.asMilliseconds=function(){return this.as("milliseconds")},g.seconds=function(){return this.get("seconds")},g.asSeconds=function(){return this.as("seconds")},g.minutes=function(){return this.get("minutes")},g.asMinutes=function(){return this.as("minutes")},g.hours=function(){return this.get("hours")},g.asHours=function(){return this.as("hours")},g.days=function(){return this.get("days")},g.asDays=function(){return this.as("days")},g.weeks=function(){return this.get("weeks")},g.asWeeks=function(){return this.as("weeks")},g.months=function(){return this.get("months")},g.asMonths=function(){return this.as("months")},g.years=function(){return this.get("years")},g.asYears=function(){return this.as("years")},I})(),H=function(I,g,d){return I.add(g.years()*d,"y").add(g.months()*d,"M").add(g.days()*d,"d").add(g.hours()*d,"h").add(g.minutes()*d,"m").add(g.seconds()*d,"s").add(g.milliseconds()*d,"ms")};return function(I,g,d){r=d,n=d().$utils(),d.duration=function(v,y){var h=d.locale();return O(v,{$l:h},y)},d.isDuration=x;var u=g.prototype.add,p=g.prototype.subtract;g.prototype.add=function(v,y){return x(v)?H(this,v,1):u.bind(this)(v,y)},g.prototype.subtract=function(v,y){return x(v)?H(this,v,-1):p.bind(this)(v,y)}}}))})(gt)),gt.exports}var ti=Ze();const ei=se(ti);var Et=(function(){var t=c(function(h,o,l,k){for(l=l||{},k=h.length;k--;l[h[k]]=o);return l},"o"),i=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],r=[1,26],n=[1,27],a=[1,28],m=[1,29],T=[1,30],E=[1,31],A=[1,32],M=[1,33],S=[1,34],Y=[1,9],_=[1,10],x=[1,11],O=[1,12],D=[1,13],U=[1,14],P=[1,15],X=[1,16],N=[1,19],B=[1,20],H=[1,21],I=[1,22],g=[1,23],d=[1,25],u=[1,35],p={trace:c(function(){},"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:c(function(o,l,k,f,b,s,W){var e=s.length-1;switch(b){case 1:return s[e-1];case 2:this.$=[];break;case 3:s[e-1].push(s[e]),this.$=s[e-1];break;case 4:case 5:this.$=s[e];break;case 6:case 7:this.$=[];break;case 8:f.setWeekday("monday");break;case 9:f.setWeekday("tuesday");break;case 10:f.setWeekday("wednesday");break;case 11:f.setWeekday("thursday");break;case 12:f.setWeekday("friday");break;case 13:f.setWeekday("saturday");break;case 14:f.setWeekday("sunday");break;case 15:f.setWeekend("friday");break;case 16:f.setWeekend("saturday");break;case 17:f.setDateFormat(s[e].substr(11)),this.$=s[e].substr(11);break;case 18:f.enableInclusiveEndDates(),this.$=s[e].substr(18);break;case 19:f.TopAxis(),this.$=s[e].substr(8);break;case 20:f.setAxisFormat(s[e].substr(11)),this.$=s[e].substr(11);break;case 21:f.setTickInterval(s[e].substr(13)),this.$=s[e].substr(13);break;case 22:f.setExcludes(s[e].substr(9)),this.$=s[e].substr(9);break;case 23:f.setIncludes(s[e].substr(9)),this.$=s[e].substr(9);break;case 24:f.setTodayMarker(s[e].substr(12)),this.$=s[e].substr(12);break;case 27:f.setDiagramTitle(s[e].substr(6)),this.$=s[e].substr(6);break;case 28:this.$=s[e].trim(),f.setAccTitle(this.$);break;case 29:case 30:this.$=s[e].trim(),f.setAccDescription(this.$);break;case 31:f.addSection(s[e].substr(8)),this.$=s[e].substr(8);break;case 33:f.addTask(s[e-1],s[e]),this.$="task";break;case 34:this.$=s[e-1],f.setClickEvent(s[e-1],s[e],null);break;case 35:this.$=s[e-2],f.setClickEvent(s[e-2],s[e-1],s[e]);break;case 36:this.$=s[e-2],f.setClickEvent(s[e-2],s[e-1],null),f.setLink(s[e-2],s[e]);break;case 37:this.$=s[e-3],f.setClickEvent(s[e-3],s[e-2],s[e-1]),f.setLink(s[e-3],s[e]);break;case 38:this.$=s[e-2],f.setClickEvent(s[e-2],s[e],null),f.setLink(s[e-2],s[e-1]);break;case 39:this.$=s[e-3],f.setClickEvent(s[e-3],s[e-1],s[e]),f.setLink(s[e-3],s[e-2]);break;case 40:this.$=s[e-1],f.setLink(s[e-1],s[e]);break;case 41:case 47:this.$=s[e-1]+" "+s[e];break;case 42:case 43:case 45:this.$=s[e-2]+" "+s[e-1]+" "+s[e];break;case 44:case 46:this.$=s[e-3]+" "+s[e-2]+" "+s[e-1]+" "+s[e];break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(i,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:r,13:n,14:a,15:m,16:T,17:E,18:A,19:18,20:M,21:S,22:Y,23:_,24:x,25:O,26:D,27:U,28:P,29:X,30:N,31:B,33:H,35:I,36:g,37:24,38:d,40:u},t(i,[2,7],{1:[2,1]}),t(i,[2,3]),{9:36,11:17,12:r,13:n,14:a,15:m,16:T,17:E,18:A,19:18,20:M,21:S,22:Y,23:_,24:x,25:O,26:D,27:U,28:P,29:X,30:N,31:B,33:H,35:I,36:g,37:24,38:d,40:u},t(i,[2,5]),t(i,[2,6]),t(i,[2,17]),t(i,[2,18]),t(i,[2,19]),t(i,[2,20]),t(i,[2,21]),t(i,[2,22]),t(i,[2,23]),t(i,[2,24]),t(i,[2,25]),t(i,[2,26]),t(i,[2,27]),{32:[1,37]},{34:[1,38]},t(i,[2,30]),t(i,[2,31]),t(i,[2,32]),{39:[1,39]},t(i,[2,8]),t(i,[2,9]),t(i,[2,10]),t(i,[2,11]),t(i,[2,12]),t(i,[2,13]),t(i,[2,14]),t(i,[2,15]),t(i,[2,16]),{41:[1,40],43:[1,41]},t(i,[2,4]),t(i,[2,28]),t(i,[2,29]),t(i,[2,33]),t(i,[2,34],{42:[1,42],43:[1,43]}),t(i,[2,40],{41:[1,44]}),t(i,[2,35],{43:[1,45]}),t(i,[2,36]),t(i,[2,38],{42:[1,46]}),t(i,[2,37]),t(i,[2,39])],defaultActions:{},parseError:c(function(o,l){if(l.recoverable)this.trace(o);else{var k=new Error(o);throw k.hash=l,k}},"parseError"),parse:c(function(o){var l=this,k=[0],f=[],b=[null],s=[],W=this.table,e="",w=0,L=0,$=2,F=1,z=s.slice.call(arguments,1),C=Object.create(this.lexer),J={yy:{}};for(var ot in this.yy)Object.prototype.hasOwnProperty.call(this.yy,ot)&&(J.yy[ot]=this.yy[ot]);C.setInput(o,J.yy),J.yy.lexer=C,J.yy.parser=this,typeof C.yylloc>"u"&&(C.yylloc={});var bt=C.yylloc;s.push(bt);var he=C.options&&C.options.ranges;typeof J.yy.parseError=="function"?this.parseError=J.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function me(q){k.length=k.length-2*q,b.length=b.length-q,s.length=s.length-q}c(me,"popStack");function zt(){var q;return q=f.pop()||C.lex()||F,typeof q!="number"&&(q instanceof Array&&(f=q,q=f.pop()),q=l.symbols_[q]||q),q}c(zt,"lex");for(var j,tt,G,wt,st={},dt,Q,Bt,ft;;){if(tt=k[k.length-1],this.defaultActions[tt]?G=this.defaultActions[tt]:((j===null||typeof j>"u")&&(j=zt()),G=W[tt]&&W[tt][j]),typeof G>"u"||!G.length||!G[0]){var _t="";ft=[];for(dt in W[tt])this.terminals_[dt]&&dt>$&&ft.push("'"+this.terminals_[dt]+"'");C.showPosition?_t="Parse error on line "+(w+1)+`:
`+C.showPosition()+`
Expecting `+ft.join(", ")+", got '"+(this.terminals_[j]||j)+"'":_t="Parse error on line "+(w+1)+": Unexpected "+(j==F?"end of input":"'"+(this.terminals_[j]||j)+"'"),this.parseError(_t,{text:C.match,token:this.terminals_[j]||j,line:C.yylineno,loc:bt,expected:ft})}if(G[0]instanceof Array&&G.length>1)throw new Error("Parse Error: multiple actions possible at state: "+tt+", token: "+j);switch(G[0]){case 1:k.push(j),b.push(C.yytext),s.push(C.yylloc),k.push(G[1]),j=null,L=C.yyleng,e=C.yytext,w=C.yylineno,bt=C.yylloc;break;case 2:if(Q=this.productions_[G[1]][1],st.$=b[b.length-Q],st._$={first_line:s[s.length-(Q||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(Q||1)].first_column,last_column:s[s.length-1].last_column},he&&(st._$.range=[s[s.length-(Q||1)].range[0],s[s.length-1].range[1]]),wt=this.performAction.apply(st,[e,L,w,J.yy,G[1],b,s].concat(z)),typeof wt<"u")return wt;Q&&(k=k.slice(0,-1*Q*2),b=b.slice(0,-1*Q),s=s.slice(0,-1*Q)),k.push(this.productions_[G[1]][0]),b.push(st.$),s.push(st._$),Bt=W[k[k.length-2]][k[k.length-1]],k.push(Bt);break;case 3:return!0}}return!0},"parse")},v=(function(){var h={EOF:1,parseError:c(function(l,k){if(this.yy.parser)this.yy.parser.parseError(l,k);else throw new Error(l)},"parseError"),setInput:c(function(o,l){return this.yy=l||this.yy||{},this._input=o,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:c(function(){var o=this._input[0];this.yytext+=o,this.yyleng++,this.offset++,this.match+=o,this.matched+=o;var l=o.match(/(?:\r\n?|\n).*/g);return l?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),o},"input"),unput:c(function(o){var l=o.length,k=o.split(/(?:\r\n?|\n)/g);this._input=o+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-l),this.offset-=l;var f=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),k.length-1&&(this.yylineno-=k.length-1);var b=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:k?(k.length===f.length?this.yylloc.first_column:0)+f[f.length-k.length].length-k[0].length:this.yylloc.first_column-l},this.options.ranges&&(this.yylloc.range=[b[0],b[0]+this.yyleng-l]),this.yyleng=this.yytext.length,this},"unput"),more:c(function(){return this._more=!0,this},"more"),reject:c(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:c(function(o){this.unput(this.match.slice(o))},"less"),pastInput:c(function(){var o=this.matched.substr(0,this.matched.length-this.match.length);return(o.length>20?"...":"")+o.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:c(function(){var o=this.match;return o.length<20&&(o+=this._input.substr(0,20-o.length)),(o.substr(0,20)+(o.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:c(function(){var o=this.pastInput(),l=new Array(o.length+1).join("-");return o+this.upcomingInput()+`
`+l+"^"},"showPosition"),test_match:c(function(o,l){var k,f,b;if(this.options.backtrack_lexer&&(b={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(b.yylloc.range=this.yylloc.range.slice(0))),f=o[0].match(/(?:\r\n?|\n).*/g),f&&(this.yylineno+=f.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:f?f[f.length-1].length-f[f.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+o[0].length},this.yytext+=o[0],this.match+=o[0],this.matches=o,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(o[0].length),this.matched+=o[0],k=this.performAction.call(this,this.yy,this,l,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),k)return k;if(this._backtrack){for(var s in b)this[s]=b[s];return!1}return!1},"test_match"),next:c(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var o,l,k,f;this._more||(this.yytext="",this.match="");for(var b=this._currentRules(),s=0;s<b.length;s++)if(k=this._input.match(this.rules[b[s]]),k&&(!l||k[0].length>l[0].length)){if(l=k,f=s,this.options.backtrack_lexer){if(o=this.test_match(k,b[s]),o!==!1)return o;if(this._backtrack){l=!1;continue}else return!1}else if(!this.options.flex)break}return l?(o=this.test_match(l,b[f]),o!==!1?o:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:c(function(){var l=this.next();return l||this.lex()},"lex"),begin:c(function(l){this.conditionStack.push(l)},"begin"),popState:c(function(){var l=this.conditionStack.length-1;return l>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:c(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:c(function(l){return l=this.conditionStack.length-1-Math.abs(l||0),l>=0?this.conditionStack[l]:"INITIAL"},"topState"),pushState:c(function(l){this.begin(l)},"pushState"),stateStackSize:c(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:c(function(l,k,f,b){switch(f){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}};return h})();p.lexer=v;function y(){this.yy={}}return c(y,"Parser"),y.prototype=p,p.Parser=y,new y})();Et.parser=Et;var ii=Et;R.extend(Je);R.extend(Se);R.extend(Ce);var te={friday:5,saturday:6},K="",Ft="",$t=void 0,Lt="",ct=[],lt=[],Yt=new Map,Wt=[],Tt=[],at="",Ot="",ne=["active","done","crit","milestone","vert"],Vt=[],ut=!1,Pt=!1,Nt="sunday",xt="saturday",It=0,si=c(function(){Wt=[],Tt=[],at="",Vt=[],pt=0,At=void 0,vt=void 0,V=[],K="",Ft="",Ot="",$t=void 0,Lt="",ct=[],lt=[],ut=!1,Pt=!1,It=0,Yt=new Map,_e(),Nt="sunday",xt="saturday"},"clear"),ri=c(function(t){Ft=t},"setAxisFormat"),ni=c(function(){return Ft},"getAxisFormat"),ai=c(function(t){$t=t},"setTickInterval"),oi=c(function(){return $t},"getTickInterval"),ci=c(function(t){Lt=t},"setTodayMarker"),li=c(function(){return Lt},"getTodayMarker"),ui=c(function(t){K=t},"setDateFormat"),di=c(function(){ut=!0},"enableInclusiveEndDates"),fi=c(function(){return ut},"endDatesAreInclusive"),hi=c(function(){Pt=!0},"enableTopAxis"),mi=c(function(){return Pt},"topAxisEnabled"),ki=c(function(t){Ot=t},"setDisplayMode"),yi=c(function(){return Ot},"getDisplayMode"),gi=c(function(){return K},"getDateFormat"),pi=c(function(t){ct=t.toLowerCase().split(/[\s,]+/)},"setIncludes"),vi=c(function(){return ct},"getIncludes"),Ti=c(function(t){lt=t.toLowerCase().split(/[\s,]+/)},"setExcludes"),xi=c(function(){return lt},"getExcludes"),bi=c(function(){return Yt},"getLinks"),wi=c(function(t){at=t,Wt.push(t)},"addSection"),_i=c(function(){return Wt},"getSections"),Di=c(function(){let t=ee();const i=10;let r=0;for(;!t&&r<i;)t=ee(),r++;return Tt=V,Tt},"getTasks"),ae=c(function(t,i,r,n){const a=t.format(i.trim()),m=t.format("YYYY-MM-DD");return n.includes(a)||n.includes(m)?!1:r.includes("weekends")&&(t.isoWeekday()===te[xt]||t.isoWeekday()===te[xt]+1)||r.includes(t.format("dddd").toLowerCase())?!0:r.includes(a)||r.includes(m)},"isInvalidDate"),Si=c(function(t){Nt=t},"setWeekday"),Ci=c(function(){return Nt},"getWeekday"),Ei=c(function(t){xt=t},"setWeekend"),oe=c(function(t,i,r,n){if(!r.length||t.manualEndTime)return;let a;t.startTime instanceof Date?a=R(t.startTime):a=R(t.startTime,i,!0),a=a.add(1,"d");let m;t.endTime instanceof Date?m=R(t.endTime):m=R(t.endTime,i,!0);const[T,E]=Ii(a,m,i,r,n);t.endTime=T.toDate(),t.renderEndTime=E},"checkTaskDates"),Ii=c(function(t,i,r,n,a){let m=!1,T=null;for(;t<=i;)m||(T=i.toDate()),m=ae(t,r,n,a),m&&(i=i.add(1,"d")),t=t.add(1,"d");return[i,T]},"fixTaskDates"),Mt=c(function(t,i,r){if(r=r.trim(),c(E=>{const A=E.trim();return A==="x"||A==="X"},"isTimestampFormat")(i)&&/^\d+$/.test(r))return new Date(Number(r));const m=/^after\s+(?<ids>[\d\w- ]+)/.exec(r);if(m!==null){let E=null;for(const M of m.groups.ids.split(" ")){let S=it(M);S!==void 0&&(!E||S.endTime>E.endTime)&&(E=S)}if(E)return E.endTime;const A=new Date;return A.setHours(0,0,0,0),A}let T=R(r,i.trim(),!0);if(T.isValid())return T.toDate();{et.debug("Invalid date:"+r),et.debug("With date format:"+i.trim());const E=new Date(r);if(E===void 0||isNaN(E.getTime())||E.getFullYear()<-1e4||E.getFullYear()>1e4)throw new Error("Invalid date:"+r);return E}},"getStartDate"),ce=c(function(t){const i=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return i!==null?[Number.parseFloat(i[1]),i[2]]:[NaN,"ms"]},"parseDuration"),le=c(function(t,i,r,n=!1){r=r.trim();const m=/^until\s+(?<ids>[\d\w- ]+)/.exec(r);if(m!==null){let S=null;for(const _ of m.groups.ids.split(" ")){let x=it(_);x!==void 0&&(!S||x.startTime<S.startTime)&&(S=x)}if(S)return S.startTime;const Y=new Date;return Y.setHours(0,0,0,0),Y}let T=R(r,i.trim(),!0);if(T.isValid())return n&&(T=T.add(1,"d")),T.toDate();let E=R(t);const[A,M]=ce(r);if(!Number.isNaN(A)){const S=E.add(A,M);S.isValid()&&(E=S)}return E.toDate()},"getEndDate"),pt=0,nt=c(function(t){return t===void 0?(pt=pt+1,"task"+pt):t},"parseId"),Mi=c(function(t,i){let r;i.substr(0,1)===":"?r=i.substr(1,i.length):r=i;const n=r.split(","),a={};Rt(n,a,ne);for(let T=0;T<n.length;T++)n[T]=n[T].trim();let m="";switch(n.length){case 1:a.id=nt(),a.startTime=t.endTime,m=n[0];break;case 2:a.id=nt(),a.startTime=Mt(void 0,K,n[0]),m=n[1];break;case 3:a.id=nt(n[0]),a.startTime=Mt(void 0,K,n[1]),m=n[2];break}return m&&(a.endTime=le(a.startTime,K,m,ut),a.manualEndTime=R(m,"YYYY-MM-DD",!0).isValid(),oe(a,K,lt,ct)),a},"compileData"),Ai=c(function(t,i){let r;i.substr(0,1)===":"?r=i.substr(1,i.length):r=i;const n=r.split(","),a={};Rt(n,a,ne);for(let m=0;m<n.length;m++)n[m]=n[m].trim();switch(n.length){case 1:a.id=nt(),a.startTime={type:"prevTaskEnd",id:t},a.endTime={data:n[0]};break;case 2:a.id=nt(),a.startTime={type:"getStartDate",startData:n[0]},a.endTime={data:n[1]};break;case 3:a.id=nt(n[0]),a.startTime={type:"getStartDate",startData:n[1]},a.endTime={data:n[2]};break}return a},"parseData"),At,vt,V=[],ue={},Fi=c(function(t,i){const r={section:at,type:at,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:i},task:t,classes:[]},n=Ai(vt,i);r.raw.startTime=n.startTime,r.raw.endTime=n.endTime,r.id=n.id,r.prevTaskId=vt,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,r.vert=n.vert,r.order=It,It++;const a=V.push(r);vt=r.id,ue[r.id]=a-1},"addTask"),it=c(function(t){const i=ue[t];return V[i]},"findTaskById"),$i=c(function(t,i){const r={section:at,type:at,description:t,task:t,classes:[]},n=Mi(At,i);r.startTime=n.startTime,r.endTime=n.endTime,r.id=n.id,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,r.vert=n.vert,At=r,Tt.push(r)},"addTaskOrg"),ee=c(function(){const t=c(function(r){const n=V[r];let a="";switch(V[r].raw.startTime.type){case"prevTaskEnd":{const m=it(n.prevTaskId);n.startTime=m.endTime;break}case"getStartDate":a=Mt(void 0,K,V[r].raw.startTime.startData),a&&(V[r].startTime=a);break}return V[r].startTime&&(V[r].endTime=le(V[r].startTime,K,V[r].raw.endTime.data,ut),V[r].endTime&&(V[r].processed=!0,V[r].manualEndTime=R(V[r].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),oe(V[r],K,lt,ct))),V[r].processed},"compileTask");let i=!0;for(const[r,n]of V.entries())t(r),i=i&&n.processed;return i},"compileTasks"),Li=c(function(t,i){let r=i;rt().securityLevel!=="loose"&&(r=we.sanitizeUrl(i)),t.split(",").forEach(function(n){it(n)!==void 0&&(fe(n,()=>{window.open(r,"_self")}),Yt.set(n,r))}),de(t,"clickable")},"setLink"),de=c(function(t,i){t.split(",").forEach(function(r){let n=it(r);n!==void 0&&n.classes.push(i)})},"setClass"),Yi=c(function(t,i,r){if(rt().securityLevel!=="loose"||i===void 0)return;let n=[];if(typeof r=="string"){n=r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let m=0;m<n.length;m++){let T=n[m].trim();T.startsWith('"')&&T.endsWith('"')&&(T=T.substr(1,T.length-2)),n[m]=T}}n.length===0&&n.push(t),it(t)!==void 0&&fe(t,()=>{De.runFunc(i,...n)})},"setClickFun"),fe=c(function(t,i){Vt.push(function(){const r=document.querySelector(`[id="${t}"]`);r!==null&&r.addEventListener("click",function(){i()})},function(){const r=document.querySelector(`[id="${t}-text"]`);r!==null&&r.addEventListener("click",function(){i()})})},"pushFun"),Wi=c(function(t,i,r){t.split(",").forEach(function(n){Yi(n,i,r)}),de(t,"clickable")},"setClickEvent"),Oi=c(function(t){Vt.forEach(function(i){i(t)})},"bindFunctions"),Vi={getConfig:c(()=>rt().gantt,"getConfig"),clear:si,setDateFormat:ui,getDateFormat:gi,enableInclusiveEndDates:di,endDatesAreInclusive:fi,enableTopAxis:hi,topAxisEnabled:mi,setAxisFormat:ri,getAxisFormat:ni,setTickInterval:ai,getTickInterval:oi,setTodayMarker:ci,getTodayMarker:li,setAccTitle:Te,getAccTitle:ve,setDiagramTitle:pe,getDiagramTitle:ge,setDisplayMode:ki,getDisplayMode:yi,setAccDescription:ye,getAccDescription:ke,addSection:wi,getSections:_i,getTasks:Di,addTask:Fi,findTaskById:it,addTaskOrg:$i,setIncludes:pi,getIncludes:vi,setExcludes:Ti,getExcludes:xi,setClickEvent:Wi,setLink:Li,getLinks:bi,bindFunctions:Oi,parseDuration:ce,isInvalidDate:ae,setWeekday:Si,getWeekday:Ci,setWeekend:Ei};function Rt(t,i,r){let n=!0;for(;n;)n=!1,r.forEach(function(a){const m="^\\s*"+a+"\\s*$",T=new RegExp(m);t[0].match(T)&&(i[a]=!0,t.shift(1),n=!0)})}c(Rt,"getTaskTags");R.extend(ei);var Pi=c(function(){et.debug("Something is calling, setConf, remove the call")},"setConf"),ie={monday:Pe,tuesday:Ve,wednesday:Oe,thursday:We,friday:Ye,saturday:Le,sunday:$e},Ni=c((t,i)=>{let r=[...t].map(()=>-1/0),n=[...t].sort((m,T)=>m.startTime-T.startTime||m.order-T.order),a=0;for(const m of n)for(let T=0;T<r.length;T++)if(m.startTime>=r[T]){r[T]=m.endTime,m.order=T+i,T>a&&(a=T);break}return a},"getMaxIntersections"),Z,St=1e4,Ri=c(function(t,i,r,n){const a=rt().gantt,m=rt().securityLevel;let T;m==="sandbox"&&(T=ht("#i"+i));const E=m==="sandbox"?ht(T.nodes()[0].contentDocument.body):ht("body"),A=m==="sandbox"?T.nodes()[0].contentDocument:document,M=A.getElementById(i);Z=M.parentElement.offsetWidth,Z===void 0&&(Z=1200),a.useWidth!==void 0&&(Z=a.useWidth);const S=n.db.getTasks();let Y=[];for(const u of S)Y.push(u.type);Y=d(Y);const _={};let x=2*a.topPadding;if(n.db.getDisplayMode()==="compact"||a.displayMode==="compact"){const u={};for(const v of S)u[v.section]===void 0?u[v.section]=[v]:u[v.section].push(v);let p=0;for(const v of Object.keys(u)){const y=Ni(u[v],p)+1;p+=y,x+=y*(a.barHeight+a.barGap),_[v]=y}}else{x+=S.length*(a.barHeight+a.barGap);for(const u of Y)_[u]=S.filter(p=>p.type===u).length}M.setAttribute("viewBox","0 0 "+Z+" "+x);const O=E.select(`[id="${i}"]`),D=Ee().domain([Ie(S,function(u){return u.startTime}),Me(S,function(u){return u.endTime})]).rangeRound([0,Z-a.leftPadding-a.rightPadding]);function U(u,p){const v=u.startTime,y=p.startTime;let h=0;return v>y?h=1:v<y&&(h=-1),h}c(U,"taskCompare"),S.sort(U),P(S,Z,x),xe(O,x,Z,a.useMaxWidth),O.append("text").text(n.db.getDiagramTitle()).attr("x",Z/2).attr("y",a.titleTopMargin).attr("class","titleText");function P(u,p,v){const y=a.barHeight,h=y+a.barGap,o=a.topPadding,l=a.leftPadding,k=Ae().domain([0,Y.length]).range(["#00B9FA","#F95002"]).interpolate(Fe);N(h,o,l,p,v,u,n.db.getExcludes(),n.db.getIncludes()),H(l,o,p,v),X(u,h,o,l,y,k,p),I(h,o),g(l,o,p,v)}c(P,"makeGantt");function X(u,p,v,y,h,o,l){u.sort((e,w)=>e.vert===w.vert?0:e.vert?1:-1);const f=[...new Set(u.map(e=>e.order))].map(e=>u.find(w=>w.order===e));O.append("g").selectAll("rect").data(f).enter().append("rect").attr("x",0).attr("y",function(e,w){return w=e.order,w*p+v-2}).attr("width",function(){return l-a.rightPadding/2}).attr("height",p).attr("class",function(e){for(const[w,L]of Y.entries())if(e.type===L)return"section section"+w%a.numberSectionStyles;return"section section0"}).enter();const b=O.append("g").selectAll("rect").data(u).enter(),s=n.db.getLinks();if(b.append("rect").attr("id",function(e){return e.id}).attr("rx",3).attr("ry",3).attr("x",function(e){return e.milestone?D(e.startTime)+y+.5*(D(e.endTime)-D(e.startTime))-.5*h:D(e.startTime)+y}).attr("y",function(e,w){return w=e.order,e.vert?a.gridLineStartPadding:w*p+v}).attr("width",function(e){return e.milestone?h:e.vert?.08*h:D(e.renderEndTime||e.endTime)-D(e.startTime)}).attr("height",function(e){return e.vert?S.length*(a.barHeight+a.barGap)+a.barHeight*2:h}).attr("transform-origin",function(e,w){return w=e.order,(D(e.startTime)+y+.5*(D(e.endTime)-D(e.startTime))).toString()+"px "+(w*p+v+.5*h).toString()+"px"}).attr("class",function(e){const w="task";let L="";e.classes.length>0&&(L=e.classes.join(" "));let $=0;for(const[z,C]of Y.entries())e.type===C&&($=z%a.numberSectionStyles);let F="";return e.active?e.crit?F+=" activeCrit":F=" active":e.done?e.crit?F=" doneCrit":F=" done":e.crit&&(F+=" crit"),F.length===0&&(F=" task"),e.milestone&&(F=" milestone "+F),e.vert&&(F=" vert "+F),F+=$,F+=" "+L,w+F}),b.append("text").attr("id",function(e){return e.id+"-text"}).text(function(e){return e.task}).attr("font-size",a.fontSize).attr("x",function(e){let w=D(e.startTime),L=D(e.renderEndTime||e.endTime);if(e.milestone&&(w+=.5*(D(e.endTime)-D(e.startTime))-.5*h,L=w+h),e.vert)return D(e.startTime)+y;const $=this.getBBox().width;return $>L-w?L+$+1.5*a.leftPadding>l?w+y-5:L+y+5:(L-w)/2+w+y}).attr("y",function(e,w){return e.vert?a.gridLineStartPadding+S.length*(a.barHeight+a.barGap)+60:(w=e.order,w*p+a.barHeight/2+(a.fontSize/2-2)+v)}).attr("text-height",h).attr("class",function(e){const w=D(e.startTime);let L=D(e.endTime);e.milestone&&(L=w+h);const $=this.getBBox().width;let F="";e.classes.length>0&&(F=e.classes.join(" "));let z=0;for(const[J,ot]of Y.entries())e.type===ot&&(z=J%a.numberSectionStyles);let C="";return e.active&&(e.crit?C="activeCritText"+z:C="activeText"+z),e.done?e.crit?C=C+" doneCritText"+z:C=C+" doneText"+z:e.crit&&(C=C+" critText"+z),e.milestone&&(C+=" milestoneText"),e.vert&&(C+=" vertText"),$>L-w?L+$+1.5*a.leftPadding>l?F+" taskTextOutsideLeft taskTextOutside"+z+" "+C:F+" taskTextOutsideRight taskTextOutside"+z+" "+C+" width-"+$:F+" taskText taskText"+z+" "+C+" width-"+$}),rt().securityLevel==="sandbox"){let e;e=ht("#i"+i);const w=e.nodes()[0].contentDocument;b.filter(function(L){return s.has(L.id)}).each(function(L){var $=w.querySelector("#"+L.id),F=w.querySelector("#"+L.id+"-text");const z=$.parentNode;var C=w.createElement("a");C.setAttribute("xlink:href",s.get(L.id)),C.setAttribute("target","_top"),z.appendChild(C),C.appendChild($),C.appendChild(F)})}}c(X,"drawRects");function N(u,p,v,y,h,o,l,k){if(l.length===0&&k.length===0)return;let f,b;for(const{startTime:$,endTime:F}of o)(f===void 0||$<f)&&(f=$),(b===void 0||F>b)&&(b=F);if(!f||!b)return;if(R(b).diff(R(f),"year")>5){et.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const s=n.db.getDateFormat(),W=[];let e=null,w=R(f);for(;w.valueOf()<=b;)n.db.isInvalidDate(w,s,l,k)?e?e.end=w:e={start:w,end:w}:e&&(W.push(e),e=null),w=w.add(1,"d");O.append("g").selectAll("rect").data(W).enter().append("rect").attr("id",$=>"exclude-"+$.start.format("YYYY-MM-DD")).attr("x",$=>D($.start.startOf("day"))+v).attr("y",a.gridLineStartPadding).attr("width",$=>D($.end.endOf("day"))-D($.start.startOf("day"))).attr("height",h-p-a.gridLineStartPadding).attr("transform-origin",function($,F){return(D($.start)+v+.5*(D($.end)-D($.start))).toString()+"px "+(F*u+.5*h).toString()+"px"}).attr("class","exclude-range")}c(N,"drawExcludeDays");function B(u,p,v,y){if(v<=0||u>p)return 1/0;const h=p-u,o=R.duration({[y??"day"]:v}).asMilliseconds();return o<=0?1/0:Math.ceil(h/o)}c(B,"getEstimatedTickCount");function H(u,p,v,y){const h=n.db.getDateFormat(),o=n.db.getAxisFormat();let l;o?l=o:h==="D"?l="%d":l=a.axisFormat??"%Y-%m-%d";let k=Xe(D).tickSize(-y+p+a.gridLineStartPadding).tickFormat(Ht(l));const b=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(n.db.getTickInterval()||a.tickInterval);if(b!==null){const s=parseInt(b[1],10);if(isNaN(s)||s<=0)et.warn(`Invalid tick interval value: "${b[1]}". Skipping custom tick interval.`);else{const W=b[2],e=n.db.getWeekday()||a.weekday,w=D.domain(),L=w[0],$=w[1],F=B(L,$,s,W);if(F>St)et.warn(`The tick interval "${s}${W}" would generate ${F} ticks, which exceeds the maximum allowed (${St}). This may indicate an invalid date or time range. Skipping custom tick interval.`);else switch(W){case"millisecond":k.ticks(Kt.every(s));break;case"second":k.ticks(Ut.every(s));break;case"minute":k.ticks(Gt.every(s));break;case"hour":k.ticks(Xt.every(s));break;case"day":k.ticks(qt.every(s));break;case"week":k.ticks(ie[e].every(s));break;case"month":k.ticks(jt.every(s));break}}}if(O.append("g").attr("class","grid").attr("transform","translate("+u+", "+(y-50)+")").call(k).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),n.db.topAxisEnabled()||a.topAxis){let s=qe(D).tickSize(-y+p+a.gridLineStartPadding).tickFormat(Ht(l));if(b!==null){const W=parseInt(b[1],10);if(isNaN(W)||W<=0)et.warn(`Invalid tick interval value: "${b[1]}". Skipping custom tick interval.`);else{const e=b[2],w=n.db.getWeekday()||a.weekday,L=D.domain(),$=L[0],F=L[1];if(B($,F,W,e)<=St)switch(e){case"millisecond":s.ticks(Kt.every(W));break;case"second":s.ticks(Ut.every(W));break;case"minute":s.ticks(Gt.every(W));break;case"hour":s.ticks(Xt.every(W));break;case"day":s.ticks(qt.every(W));break;case"week":s.ticks(ie[w].every(W));break;case"month":s.ticks(jt.every(W));break}}}O.append("g").attr("class","grid").attr("transform","translate("+u+", "+p+")").call(s).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}c(H,"makeGrid");function I(u,p){let v=0;const y=Object.keys(_).map(h=>[h,_[h]]);O.append("g").selectAll("text").data(y).enter().append(function(h){const o=h[0].split(be.lineBreakRegex),l=-(o.length-1)/2,k=A.createElementNS("http://www.w3.org/2000/svg","text");k.setAttribute("dy",l+"em");for(const[f,b]of o.entries()){const s=A.createElementNS("http://www.w3.org/2000/svg","tspan");s.setAttribute("alignment-baseline","central"),s.setAttribute("x","10"),f>0&&s.setAttribute("dy","1em"),s.textContent=b,k.appendChild(s)}return k}).attr("x",10).attr("y",function(h,o){if(o>0)for(let l=0;l<o;l++)return v+=y[o-1][1],h[1]*u/2+v*u+p;else return h[1]*u/2+p}).attr("font-size",a.sectionFontSize).attr("class",function(h){for(const[o,l]of Y.entries())if(h[0]===l)return"sectionTitle sectionTitle"+o%a.numberSectionStyles;return"sectionTitle"})}c(I,"vertLabels");function g(u,p,v,y){const h=n.db.getTodayMarker();if(h==="off")return;const o=O.append("g").attr("class","today"),l=new Date,k=o.append("line");k.attr("x1",D(l)+u).attr("x2",D(l)+u).attr("y1",a.titleTopMargin).attr("y2",y-a.titleTopMargin).attr("class","today"),h!==""&&k.attr("style",h.replace(/,/g,";"))}c(g,"drawToday");function d(u){const p={},v=[];for(let y=0,h=u.length;y<h;++y)Object.prototype.hasOwnProperty.call(p,u[y])||(p[u[y]]=!0,v.push(u[y]));return v}c(d,"checkUnique")},"draw"),zi={setConf:Pi,draw:Ri},Bi=c(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${t.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .vert {
    stroke: ${t.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${t.vertLineColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: ${t.fontFamily};
  }
`,"getStyles"),Hi=Bi,Ki={parser:ii,db:Vi,renderer:zi,styles:Hi};export{Ki as diagram};
