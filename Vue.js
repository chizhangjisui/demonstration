//获取页面中的元素-将数据放到临时内存区域-应用Vue数据-渲染页面
//之所以是放到临时内存区域中的原因是为了减少dom的操作，一次性将dom操作完
//1.创建Vue类
class Vue {
    constructor(obj_instance) {
        //obj_instance为传入的配置项
        this.$data = obj_instance.data()
        console.log(this.$data)
        //使用了设计模式中的观察者模式,实现数据劫持
        Observer(this.$data)
        //模板解析
        Compile(obj_instance.el, this)
    }
}
//创建Observer函数，该函数的目的是将目标对象的每个属性进行数据劫持
function Observer(data) {
    if (typeof data != 'object' || !data) return;
    //为每一个对象创建依赖
    //循环对象中的每一条属性,为每一条属性进行数据劫持
    Object.keys(data).forEach(function(key){
        const dependency = new Dependency()
        //使用Object.defineProperty来进行数据代理
        /*
            Object.definePropery(操作对象,操作属性,{
                enumerable:true,//设置属性是否可以被枚举
                configurable:true//设置属性是否可以被改变
                get(){
                    
                },//获取属性时调用get方法
                set(){

                }//设置属性时调用set方法
            })
        */
        let value = data[key]
        Observer(value)//递归，将每层数据实现代理
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get() {
                Dependency.temp && dependency.addSub(Dependency.temp)
                return value
            },
            set(newvalue) {
                value = newvalue
                Observer(value)//重新赋值后，需要实现数据劫持
                dependency.notify()
            }
        })
    });
}
//先介绍一下document.createDocumentFragment
/*
    createDocumentFragment用来创建文档碎片，文档碎片是什么内，
    文档碎片可以理解为轻量化的文档，它可以包含DOM元素以及对DOM元
    素继续操作，但是它不会渲染到页面中去，如果对DOM元素频繁操作，
    我们可以使用文档碎片来提升性能效率。
*/
//模板解析，将数据解析到页面上,同时实现发布订阅模式
function Compile(element, vm) {
    vm.$el = document.querySelector(element)
    console.dir(vm.$el.childNodes[0])
    const fragment = document.createDocumentFragment()
    let child;

    while (child = vm.$el.firstChild) {
        fragment.append(child)
    }//将元素取出来放置到fragment中
    //之后对文本节点进行处理,文本节点的type为3,将{{}}进行处理
    //dom元素的nodetype为1
    //属性节点为2
    //文本元素的nodetype为3
    compilt_textNode(fragment)
    function compilt_textNode(node) {
        console.log("进行编译")
        //如果是文本元素,那么就查找该文本元素中是否存在匹配项
        if (node.nodeType === 3) {
            let xxx = node.textContent
            let compilt_place = xxx.match(/(?<=\{\{).*?(?=\}\})/g)
            if (compilt_place) {
                //这里目前只考虑data中的数据,不考虑表达式的问题
                compilt_place.forEach(item => {
                    //考虑到xxx.xxx.xx的情况
                    let result = item.split(".").reduce((total, current) => {
                        return total[current]
                    }, vm.$data)
                    node.textContent = xxx.replaceAll(`{{${item}}}`, result)
                    //创建观察者,node.textContent....这条代码以后只要数据发生改变就要重复执行的
                    new Watcher(vm, item, newvalue => {
                        node.textContent = xxx.replaceAll(`{{${item}}}`, newvalue)
                    })
                })
            }
            return
        }
        //判断input上是否存在v-model,如果存在实现双向绑定
        if (node.nodeType === 1 && node.nodeName === 'INPUT') {
            console.log("---")
            for (let i = 0; i < node.attributes.length; i++) {
                if (node.attributes[i].nodeName === 'v-model') {
                    console.log(node.attributes[i].value)
                    let value = node.attributes[i].value
                    // let value = node.textContent.split(".").reduce((total,current)=>total[current],vm.$data)
                    node.value = value.split(".").reduce((total, current) => total[current], vm.$data)
                    new Watcher(vm, value, newvalue => {
                        console.log("input设置")
                        node.value = newvalue
                    })
                    node.addEventListener('input', e => {
                        let keyArr = node.attributes[i].value.split(".")
                        let keyArr02 = keyArr.slice(0, keyArr.length - 1)
                        console.log(1)
                        let final = keyArr02.reduce((total, current) => { return total[current] }, vm.$data)
                        console.log(2)
                        final[keyArr[keyArr.length - 1]] = e.target.value
                    })
                }
            }
        }
        node.childNodes.forEach(item => {
            compilt_textNode(item)
        })
    }
    vm.$el.appendChild(fragment)
}
//之后要实现发布者订阅者模式了
//发布者实例
class Dependency {
    constructor() {
        this.subscribers = []
    }
    addSub(sub) {
        this.subscribers.push(sub)
    }
    notify() {
        console.log("subscribers", this.subscribers, "更新订阅")
        this.subscribers.forEach(sub => {
            sub.update()
        })
    }
}
//订阅者实例
class Watcher {
    constructor(vm, key, callback) {
        this.vm = vm
        this.key = key
        this.callback = callback
        //临时属性 - 触发getter
        Dependency.temp = this
        //触发一次get,目的是间数据添加到依赖中去
        key.split(".").reduce((total, current) => total[current], vm.$data)
        Dependency.temp = null
    }
    update() {
        this.callback(this.key.split(".").reduce((total, current) => total[current], this.vm.$data))
    }
}