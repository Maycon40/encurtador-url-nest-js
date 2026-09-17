import { BadRequestException } from '@nestjs/common';

const priorityOrder = [
  'isNotEmpty',
  'isDefined',
  'isString',
  'isNumber',
  'isEmail',
  'minLength',
  'maxLength',
  'matches',
];

export function exceptionFactory(errors) {
  const customMessages: string[] = [];

  for (const error of errors) {
    if (!error.constraints) continue;

    const constraintKeys = Object.keys(error.constraints);

    constraintKeys.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);

      const priorityA = indexA === -1 ? 999 : indexA;
      const priorityB = indexB === -1 ? 999 : indexB;

      return priorityA - priorityB;
    });

    const highestPriorityKey = constraintKeys[0];
    customMessages.push(error.constraints[highestPriorityKey]);
  }

  return new BadRequestException(customMessages);
}
