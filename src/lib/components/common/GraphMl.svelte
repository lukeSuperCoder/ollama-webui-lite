<script lang="ts">
    import cytoscape from 'cytoscape';
    import graphml from 'cytoscape-graphml';

    // 注册 graphml 插件
    cytoscape.use(graphml);

    let cy: any;

    // 处理文件选择
    const handleFileSelect = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            const text = await file.text();
            loadGraphML(text);
        }
    };

    // 加载和渲染 GraphML 数据
    const loadGraphML = (graphmlData: string) => {
        if (cy) {
            cy.destroy(); // 销毁现有实例
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(graphmlData, "application/xml");

        const nodes = xmlDoc.getElementsByTagName("node");
        const edges = xmlDoc.getElementsByTagName("edge"); // 获取边
        const elements = [];

        // Parse nodes
        Array.from(nodes).forEach(node => {
            const id = node.getAttribute('id');
            const entityType = node.querySelector('data[key="d0"]').textContent;
            const description = node.querySelector('data[key="d1"]').textContent;
            const sourceId = node.querySelector('data[key="d2"]').textContent;

            elements.push({
            data: {
                id: id,
                label: description,
                entityType: entityType,
                sourceId: sourceId
            }
            });
        });

        // Parse edges (connections between nodes)
        Array.from(edges).forEach(edge => {
            const source = edge.getAttribute('source');
            const target = edge.getAttribute('target');
            
            elements.push({
            data: {
                source: source,
                target: target
            }
            });
        });
        console.log('Nodes:', elements.filter(el => el.data.sourceId));
        console.log('Edges:', elements.filter(el => el.data.source && el.data.target));
        
        // Initialize Cytoscape
        cy = cytoscape({
            container: document.getElementById('cy'),
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#007bff',
                        'label': 'data(entityType)',
                        'width': 60,
                        'height': 60,
                        'color': '#000',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-wrap': 'wrap', // Enable text wrapping
                        'text-max-width': 50, // Set maximum text width
                        'border-width': 2
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#000',
                        'target-arrow-color': '#000',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'grid',
                rows: 5
            }
        });
    };
</script>

<style>
    #cy {
        width: 100%;
        height: 600px;
        border: 1px solid #ccc;
    }
    #cy .cy-node-label {
    white-space: normal !important;  /* 允许文字换行 */
    word-wrap: break-word !important;  /* 强制文本在节点内换行 */
    }
</style>

<div>
    <input type="file" accept=".graphml" on:change={handleFileSelect} />
    <div id="cy"></div>
</div>
