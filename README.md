# ngx-scanner-qrcode

This library is built to provide a solution scanner QR code.\
This library takes in raw images and will locate, extract and parse any QR code found within.\
This demo [stackblitz](https://stackblitz.com/edit/angular-ngx-scanner-qrcode?file=src/app/app.component.html).

![Logo](https://raw.githubusercontent.com/id1945/ngx-scanner-qrcode/master/ngx-scanner-qrcode.png)

## Installation

Install `ngx-scanner-qrcode` from `npm`:

```bash
npm install ngx-scanner-qrcode --save
```

Add wanted package to NgModule imports:
```typescript
import { NgxScannerQrcodeModule } from 'ngx-scanner-qrcode';
@NgModule({
    imports: [
        NgxScannerQrcodeModule,
    ]
})
```

In the Component:

```html
<ngx-scanner-qrcode #action="scanner"></ngx-scanner-qrcode>
<span>{{action.data}}</span>
<button (click)="action.toggleCamera()" [disabled]="action.isLoading">{{action.isStart ? 'Stop' : 'Start'}}</button>
```

### API Documentation

#### Input

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| line | line frame qrcode | number | 4 |
| color | color of line | string | `#008000` |

#### Ouput

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| event | data of qrcode | string | - |
| error | error | any | - |

#### Component export

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| toggleCamera | Active/Inactive camera | function | - |
| start | Active camera | function | - |
| stop | Inactive camera | function | - |
| play | Play function | void | - |
| pause | Pause function | void | - |
| download | Download function | string | - |
| isLoading | Check start fn | boolean | false |
| isStart | Start Video | boolean | false |


#### Support versions
  
<table>
  <tr>
    <th colspan="2">Support versions</th>
  </tr>
  <tr>
    <td>Angular 9</td>
    <td>1.1.0</td>
  </tr>
  <tr>
    <td>Angular 8</td>
    <td>1.0.17</td>
  </tr>
</table>

#### Author Information
  
<table>
  <tr>
    <th colspan="2">Author Information</th>
  </tr>
  <tr>
    <td>Author</td>
    <td>DaiDH</td>
  </tr>
  <tr>
    <td>Phone</td>
    <td>+84845882882</td>
  </tr>
</table>

![Vietnam](https://raw.githubusercontent.com/id1945/id1945/master/vietnam.gif)

[MIT License](https://github.com/id1945/ngx-scanner-qrcode/blob/master/LICENSE). Copyright (c) 2021 DaiDH