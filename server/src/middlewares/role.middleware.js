const authorizationRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            })
        };
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denide'
            })
        };
        next();
    }
};

export const authorizeRoles = authorizationRoles;

//ye user verify middleware sa aaraha ha Ex- req.user ye ha
// allowedRoles = ["admin"] ya rout se
//req.user.role = "user"  ya verifyMeddleware sa aaraha ha 