export let id=(name)=>`virtual:${name}`
export let resolve=(id)=>`\0${id}`;
export let url=(id)=>`/@id/__x00__${id}`;