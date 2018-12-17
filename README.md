# CS739 Final Project - OSD Hierarchy Visualization



[TOC]



## Project Description

Show OSD Hierarchical structure in Ceph cluster.



## Project Detail

### Data Flow

1. Ceph cluster generate JSON data ([rawdata](./data/rawdata))
2. Backend process the data to feed d3.js specification ([data_process.ipynb](./data/data_process.ipynb))
3. Frontend visualize the data ([page](./index.html))

#### Rawdata

[Rawdata](./data/rawdata) shows what a normal size cluster that applied Ceph will look like. Each JSON file is structured as below:

```python
# JSON File Structure
{
    "nodes": [ <nodes...> ],
    "strays": [ <nodes...> ]
}
# OSD Node
{
    "id": 831,
    "device_class": "hdd",
    "name": "osd.831",
    "type": "osd",
    "type_id": 0,
    "crush_weight": 5.457993,
    "depth": 3,
    "pool_weights": {},
    "exists": 1,
    "status": "up",
    "reweight": 1.000000,
    "primary_affinity": 1.000000
}
# Internal Node (not OSD)
{
    "id": -92,		 # id : unique node id
    "name": "drain", # name: the name of the device
    "type": "root",  # type: root, room, rack, row, host, ipserver...
    "type_id": 6,    # type_id: each id correspond to a specific type
    "pool_weights": {},
    "children": [-132]# children: array of children ndoe id
}
```



#### Processed Data

[Product](./data/product) shows us the production data that will apply to d3.js.

Since d3.js require hierarchical data to be as the following format:

```
{
    "name": String
    "children": Array of nodes
    // optional __data__
}
```

for time saving purpose (and better dev experience), we first do data processing in the backend, and use the generated data to feed the frontend.

The brief logic of data processing is as follows:

1. (**Simple DFS**) Hierachically construct the data tree by DFS the whole raw (flat) version of the data.
2. (**Annotation**) Add auxilary information to support D3 processing. Such as:
   - `osd_count` : sum of the `osd_counts` of children.
   - `osd_health` : sum of `osd_health` of children. Usually useful to compare with `osd_count` and see how many nodes are failed in order to show the color gradient
   - (TODO) `total_crush_weight`: sum of `total_crush_weight` of children. Originated from the OSD's `crush_weight`
   - `type`: the type of itself. (maybe delete it? just more convenient,..)

In this project we use the following dataset as our visaulize target:

- `kelly.product.json`: about 4K+ line of code
- `beesly.product.json`: about 7K+ line of code
- `erin.product.json`: about 13k+ code
- `jim.product.json`: about 2W+ code



#### Time Series Data





### Visualization

Zoomable Sequence Sunburst is the model we target on. Specifically we will focus on

- Location of a specific node (osd.12 is under `root->room2->rack3->row4->host5`)
- Node health status in a hierachical view (`host5` has 30 osds, 3 of them are `down (red)`, 3 `out(gray)`, rest are healthy `green`)
- Node weight





## Changelog (12/14 update)

#### Important

- [x] Zoomable Funtionality of the pie chart
  - [x] Zoom & unzoom logic
  - [ ] Improve zoom&unzoom: store the parent-child path
- [x] Animation Delay
- [ ] Color

  - [ ] Color schemes
  - [ ] Gradient effect of the color
- [x] Too much OSD show case
- [x] Reasonable, selectable (changeable) color schemes (for different purpose)

  - [x] Hierachical path
- [x] Different information
  - [x] crush map weight // currently based on osd_counts
  - [x] up/down information
  - [x] use gradient color to indicate failure
- [ ] Animation Delay

  - [ ] Somehow significant delay using `beesly.product.json`
- [ ] A panel for selection of features
- [ ] Time Series


#### Not so Urgent

- [ ] Change File might change data location - Should find a way to update data with least change of element in webpage
- [ ] Label each node (if possible, since we don't like the look..)

#### Bugs

- [ ] White lines when zoomed in (the white padding of the circle)





## Ideas

[Sequence Ring](./themes/visit-sequence) and Zoomable Sunburst ([this](https://bl.ocks.org/vasturiano/12da9071095fbd4df434e60d52d2d58d), [this](https://beta.observablehq.com/@mbostock/d3-sunburst))