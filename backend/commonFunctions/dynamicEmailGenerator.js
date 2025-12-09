

export const makeIncrementalEmail = (email) => {
//   let counter = 1;
  const [local, domain] = email.split("@");
  console.log(local,domain);
  const randomValue = Math.floor(1+Math.random()*100);
  const alias = `${local}+${String(randomValue)}@${domain}`;
//   counter++;
  return alias;
};


export default makeIncrementalEmail;
